import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  type InputVideoTrack,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH,
  VideoSample,
  VideoSampleSink,
  type VideoCodec,
  canEncodeVideo,
} from 'mediabunny';
import { Enhancer, type FrameLayout } from './enhancer';
import type { EnhanceParams } from './params';

export type ScaleChoice = 'auto' | '1' | '1.5' | '2';

export interface VideoInfo {
  width: number; // display width
  height: number; // display height
  codedWidth: number;
  codedHeight: number;
  rotation: 0 | 90 | 180 | 270;
  duration: number;
  start: number;
  fps: number;
  codec: string | null;
  hasAudio: boolean;
}

const MAX_LONG_SIDE = 3840;

export function outputSize(info: VideoInfo, scale: ScaleChoice): { width: number; height: number; factor: number } {
  const long = Math.max(info.width, info.height);
  let factor: number;
  if (scale === 'auto') factor = long <= 1000 ? 2 : long <= 1400 ? 1.5 : 1;
  else factor = Number(scale);
  factor = Math.min(factor, MAX_LONG_SIDE / long);
  const even = (v: number) => Math.max(2, Math.round(v / 2) * 2);
  return { width: even(info.width * factor), height: even(info.height * factor), factor };
}

export class LoadedVideo {
  private constructor(
    readonly file: File,
    readonly input: Input,
    readonly track: InputVideoTrack,
    readonly info: VideoInfo,
    private sink: VideoSampleSink,
  ) {}

  static async open(file: File): Promise<LoadedVideo> {
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('No video track found in this file.');
    if (!(await track.canDecode())) {
      throw new Error(`This browser can't decode the video (codec: ${track.codec ?? 'unknown'}). Try Safari or Chrome.`);
    }
    const [duration, start, rotation, stats, audio] = await Promise.all([
      input.computeDuration(),
      track.getFirstTimestamp(),
      track.getRotation(),
      track.computePacketStats(60),
      input.getPrimaryAudioTrack(),
    ]);
    const info: VideoInfo = {
      width: track.displayWidth,
      height: track.displayHeight,
      codedWidth: track.codedWidth,
      codedHeight: track.codedHeight,
      rotation: rotation as VideoInfo['rotation'],
      duration,
      start,
      fps: stats.averagePacketRate || 30,
      codec: track.codec,
      hasAudio: !!audio,
    };
    return new LoadedVideo(file, input, track, info, new VideoSampleSink(track));
  }

  /**
   * Prepare a preview at time `t`: decodes a short run-up so the temporal denoiser has history
   * (making the preview match the export) and returns the target frame, still open, so it can be
   * re-rendered cheaply with `enhancer.render(frame, params, split, false)`. Caller must close it.
   */
  async preparePreview(enhancer: Enhancer, layout: FrameLayout, t: number, params: EnhanceParams, signal?: AbortSignal): Promise<VideoSample | null> {
    enhancer.configure(layout);
    enhancer.reset();
    const runUp = params.temporalDenoise > 0 ? Math.min(0.3, 8 / this.info.fps) : 0;
    const from = Math.max(this.info.start, t - runUp);
    let last: VideoSample | null = null;
    for await (const sample of this.sink.samples(from, t + 0.0001)) {
      if (signal?.aborted) {
        sample.close();
        last?.close();
        return null;
      }
      if (last) {
        enhancer.render(last.toCanvasImageSource(), params, 0, true);
        last.close();
      }
      last = sample;
    }
    if (!last) last = await this.sink.getSample(t);
    if (signal?.aborted) {
      last?.close();
      return null;
    }
    return last;
  }

  dispose() {
    this.input.dispose();
  }
}

export interface ExportProgress {
  progress: number; // 0..1
  fps: number;
  etaSeconds: number;
}

export interface ExportResult {
  blob: Blob;
  codec: VideoCodec;
  width: number;
  height: number;
  seconds: number;
}

async function pickCodec(width: number, height: number): Promise<{ codec: VideoCodec; quality: typeof QUALITY_HIGH }> {
  const format = new Mp4OutputFormat();
  const supported = format.getSupportedVideoCodecs();
  // H.264 first: it plays and saves everywhere (Photos, Windows, social apps). HEVC as fallback.
  for (const codec of ['avc', 'hevc', 'vp9', 'av1'] as VideoCodec[]) {
    if (!supported.includes(codec)) continue;
    for (const quality of [QUALITY_VERY_HIGH, QUALITY_HIGH]) {
      if (await canEncodeVideo(codec, { width, height, bitrate: quality })) return { codec, quality };
    }
  }
  throw new Error(`This browser can't encode a ${width}×${height} video. Try a smaller output size.`);
}

export async function exportEnhanced(
  video: LoadedVideo,
  enhancer: Enhancer,
  params: EnhanceParams,
  scale: ScaleChoice,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<ExportResult> {
  const { width, height } = outputSize(video.info, scale);
  const { codec, quality } = await pickCodec(width, height);

  // A fresh Input so export decoding doesn't fight with preview decoding.
  const input = new Input({ source: new BlobSource(video.file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });

  enhancer.reset();
  let configuredFor = '';
  const conversion = await Conversion.init({
    input,
    output,
    tracks: 'primary',
    showWarnings: false,
    video: {
      codec,
      quality,
      forceTranscode: true,
      allowTransformationMetadata: false,
      processedWidth: width,
      processedHeight: height,
      process: (sample) => {
        const rotation = (((sample.rotation % 360) + 360) % 360) as FrameLayout['rotation'];
        const key = `${sample.codedWidth}x${sample.codedHeight}@${rotation}`;
        if (key !== configuredFor) {
          enhancer.configure({ codedWidth: sample.codedWidth, codedHeight: sample.codedHeight, rotation, outWidth: width, outHeight: height });
          configuredFor = key;
        }
        enhancer.render(sample.toCanvasImageSource(), params, 0);
        return new VideoSample(enhancer.canvas, { timestamp: sample.timestamp, duration: sample.duration });
      },
    },
    audio: {},
  });

  if (!conversion.isValid) {
    const reasons = conversion.discardedTracks.map((d) => `${d.track.type}: ${d.reason}`).join(', ');
    throw new Error(`Can't convert this file (${reasons}).`);
  }

  const started = performance.now();
  const total = video.info.duration * video.info.fps;
  conversion.onProgress = (progress) => {
    const elapsed = (performance.now() - started) / 1000;
    const fps = elapsed > 0.5 ? (progress * total) / elapsed : 0;
    const eta = progress > 0.01 ? (elapsed / progress) * (1 - progress) : NaN;
    onProgress({ progress, fps, etaSeconds: eta });
  };

  const abort = () => void conversion.cancel();
  signal.addEventListener('abort', abort, { once: true });
  try {
    await conversion.execute();
  } finally {
    signal.removeEventListener('abort', abort);
    input.dispose();
  }
  if (signal.aborted) throw new DOMException('Canceled', 'AbortError');

  const buffer = output.target.buffer;
  if (!buffer) throw new Error('Export produced no data.');
  return {
    blob: new Blob([buffer], { type: 'video/mp4' }),
    codec,
    width,
    height,
    seconds: (performance.now() - started) / 1000,
  };
}
