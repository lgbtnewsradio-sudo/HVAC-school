import './style.css';
import type { VideoSample } from 'mediabunny';
import { Enhancer, type FrameLayout } from './enhancer';
import { aiAutoTune, getGeminiKey, setGeminiKey } from './gemini';
import { DEFAULT_PARAMS, PARAM_SPECS, type EnhanceParams, clampParams } from './params';
import { LoadedVideo, type ScaleChoice, exportEnhanced, outputSize } from './video';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const PRESETS: { name: string; params: Partial<EnhanceParams> }[] = [
  { name: 'Balanced', params: {} },
  {
    name: 'Very dark',
    params: { brightness: 0.7, shadows: 0.75, temporalDenoise: 0.85, spatialDenoise: 0.7, blackPoint: 0.45, sharpen: 0.3, saturation: 1.15, contrast: 0.4 },
  },
  { name: 'Warm indoor', params: { colorFix: 0.85, saturation: 1.05 } },
  { name: 'Keep the mood', params: { brightness: 0.42, shadows: 0.45, colorFix: 0.15, saturation: 1.05, contrast: 0.45 } },
  { name: 'Fast motion', params: { temporalDenoise: 0.35, spatialDenoise: 0.65, sharpen: 0.3 } },
];

const PARAMS_STORAGE = 'lumafix.params';
const SCALE_STORAGE = 'lumafix.scale';

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

let enhancer: Enhancer;
let video: LoadedVideo | null = null;
let params: EnhanceParams = clampParams(loadStored(PARAMS_STORAGE, DEFAULT_PARAMS));
let scale: ScaleChoice = loadStored<ScaleChoice>(SCALE_STORAGE, 'auto');
let split = 0.5;
let previewTime = 0;
let held: VideoSample | null = null;
let previewAbort: AbortController | null = null;
let exportAbort: AbortController | null = null;
let resultUrl: string | null = null;
let resultFile: File | null = null;

// ---------- helpers ----------

function fmtTime(s: number) {
  if (!Number.isFinite(s)) return '–';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

let toastTimer = 0;
function toast(msg: string, error = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('error', error);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.hidden = true), error ? 7000 : 3500);
}

function previewLayout(): FrameLayout {
  const info = video!.info;
  const long = Math.max(info.width, info.height);
  const k = Math.min(1, 1600 / long);
  const even = (v: number) => Math.max(2, Math.round(v / 2) * 2);
  return {
    codedWidth: info.codedWidth,
    codedHeight: info.codedHeight,
    rotation: info.rotation,
    outWidth: even(info.width * k),
    outHeight: even(info.height * k),
  };
}

// ---------- preview ----------

let previewQueued = false;
/** Re-render the held frame only (split / small param changes). */
function quickRender() {
  if (previewQueued) return;
  previewQueued = true;
  requestAnimationFrame(() => {
    previewQueued = false;
    if (!held) return;
    try {
      enhancer.render(held.toCanvasImageSource(), params, split, false);
    } catch (e) {
      console.error(e);
    }
  });
}

let fullTimer = 0;
/** Re-decode the run-up and render (time changes, or denoise changes that need fresh history). */
function schedulePreview(delay = 120) {
  clearTimeout(fullTimer);
  fullTimer = window.setTimeout(runPreview, delay);
}

async function runPreview() {
  if (!video) return;
  previewAbort?.abort();
  const ac = new AbortController();
  previewAbort = ac;
  $('busy').hidden = false;
  try {
    const frame = await video.preparePreview(enhancer, previewLayout(), previewTime, params, ac.signal);
    if (ac.signal.aborted) {
      frame?.close();
      return;
    }
    held?.close();
    held = frame;
    if (held) enhancer.render(held.toCanvasImageSource(), params, split, false);
  } catch (e) {
    if (!ac.signal.aborted) {
      console.error(e);
      toast(`Preview failed: ${(e as Error).message}`, true);
    }
  } finally {
    if (previewAbort === ac) $('busy').hidden = true;
  }
}

// ---------- UI building ----------

function buildSliders() {
  const box = $('sliders');
  box.innerHTML = '';
  for (const spec of PARAM_SPECS) {
    const wrap = document.createElement('div');
    wrap.className = 'slider';
    const id = `p-${spec.key}`;
    wrap.innerHTML = `<label for="${id}"><span>${spec.label}</span><output id="${id}-v"></output></label>
      <input id="${id}" type="range" min="${spec.min}" max="${spec.max}" step="0.01" title="${spec.help}" />`;
    box.appendChild(wrap);
    const input = wrap.querySelector('input')!;
    input.addEventListener('input', () => {
      params = { ...params, [spec.key]: Number(input.value) };
      syncSliderLabels();
      markPreset();
      store(PARAMS_STORAGE, params);
      // Temporal strength changes need a fresh run-up for an honest preview; others are instant.
      if (spec.key === 'temporalDenoise') schedulePreview(180);
      else quickRender();
    });
  }
  syncSliders();
}

function syncSliderLabels() {
  for (const spec of PARAM_SPECS) {
    const v = params[spec.key];
    $(`p-${spec.key}-v`).textContent = spec.key === 'saturation' ? `${Math.round(v * 100)}%` : `${Math.round(v * 100)}`;
  }
}

function syncSliders() {
  for (const spec of PARAM_SPECS) ($(`p-${spec.key}`) as HTMLInputElement).value = String(params[spec.key]);
  syncSliderLabels();
  markPreset();
}

function buildPresets() {
  const box = $('presets');
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = p.name;
    b.dataset.name = p.name;
    b.addEventListener('click', () => applyParams(clampParams({ ...DEFAULT_PARAMS, ...p.params })));
    box.appendChild(b);
  }
}

function markPreset() {
  for (const b of $('presets').querySelectorAll<HTMLButtonElement>('.chip')) {
    const preset = PRESETS.find((p) => p.name === b.dataset.name)!;
    const target = clampParams({ ...DEFAULT_PARAMS, ...preset.params });
    const same = PARAM_SPECS.every((s) => Math.abs(target[s.key] - params[s.key]) < 0.005);
    b.setAttribute('aria-pressed', String(same));
  }
}

function applyParams(p: EnhanceParams) {
  params = p;
  store(PARAMS_STORAGE, params);
  syncSliders();
  schedulePreview(0);
}

function updateOutInfo() {
  if (!video) return;
  const o = outputSize(video.info, scale);
  const up = o.factor > 1.01 ? ` (${o.factor.toFixed(1).replace('.0', '')}× upscale)` : '';
  $('outInfo').textContent = `Output: ${o.width}×${o.height}${up}`;
}

// ---------- loading ----------

async function openFile(file: File) {
  previewAbort?.abort();
  held?.close();
  held = null;
  video?.dispose();
  video = null;
  $('busy').hidden = false;
  try {
    video = await LoadedVideo.open(file);
  } catch (e) {
    $('busy').hidden = true;
    toast((e as Error).message, true);
    return;
  }
  const info = video.info;
  $('empty').hidden = true;
  $('editor').hidden = false;
  const stage = $('stage');
  if (!stage.contains(enhancer.canvas)) stage.prepend(enhancer.canvas);

  const time = $('time') as HTMLInputElement;
  time.min = String(info.start);
  time.max = String(info.start + info.duration);
  previewTime = info.start + Math.min(info.duration * 0.25, 2);
  time.value = String(previewTime);
  $('tdur').textContent = fmtTime(info.duration);
  $('tcur').textContent = fmtTime(previewTime - info.start);
  $('meta').textContent = `${info.width}×${info.height} · ${Math.round(info.fps)} fps · ${fmtTime(info.duration)} · ${(file.size / 1e6).toFixed(1)} MB`;
  updateOutInfo();
  await runPreview();
}

// ---------- export ----------

async function startExport() {
  if (!video) return;
  previewAbort?.abort();
  exportAbort = new AbortController();
  $('progress').hidden = false;
  ($('barFill') as HTMLDivElement).style.width = '0%';
  $('progText').textContent = 'Starting…';

  let wakeLock: { release(): Promise<void> } | null = null;
  try {
    wakeLock = (await (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen')) ?? null;
  } catch {
    /* not supported */
  }

  try {
    const res = await exportEnhanced(
      video,
      enhancer,
      params,
      scale,
      (p) => {
        ($('barFill') as HTMLDivElement).style.width = `${(p.progress * 100).toFixed(1)}%`;
        const eta = Number.isFinite(p.etaSeconds) ? ` · about ${fmtTime(p.etaSeconds)} left` : '';
        $('progText').textContent = `${Math.round(p.progress * 100)}% · ${p.fps.toFixed(1)} frames/s${eta}`;
      },
      exportAbort.signal,
    );
    const base = video.file.name.replace(/\.[^.]+$/, '') || 'video';
    resultFile = new File([res.blob], `${base}-LumaFix.mp4`, { type: 'video/mp4' });
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(resultFile);
    const vid = $('result') as HTMLVideoElement;
    vid.src = resultUrl;
    void vid.play().catch(() => {});
    const dl = $('download') as HTMLAnchorElement;
    dl.href = resultUrl;
    dl.download = resultFile.name;
    $('doneText').textContent = `${res.width}×${res.height} · ${res.codec.toUpperCase()} · ${(res.blob.size / 1e6).toFixed(1)} MB · took ${fmtTime(res.seconds)}`;
    const canShare = !!navigator.canShare?.({ files: [resultFile] });
    $('save').hidden = !canShare;
    $('saveHint').hidden = !canShare;
    $('progress').hidden = true;
    $('done').hidden = false;
  } catch (e) {
    $('progress').hidden = true;
    if ((e as Error).name !== 'AbortError' && !exportAbort.signal.aborted) {
      console.error(e);
      toast(`Export failed: ${(e as Error).message}`, true);
    }
  } finally {
    exportAbort = null;
    void wakeLock?.release().catch(() => {});
    schedulePreview(0);
  }
}

async function saveToPhotos() {
  if (!resultFile) return;
  try {
    await navigator.share({ files: [resultFile] });
  } catch (e) {
    if ((e as Error).name !== 'AbortError') toast(`Couldn't open the share sheet: ${(e as Error).message}`, true);
  }
}

// ---------- AI ----------

async function runAi() {
  if (!video || !held) return;
  const key = getGeminiKey();
  if (!key) {
    const details = $('key').closest('details') as HTMLDetailsElement;
    details.open = true;
    $('key').focus();
    toast('Add your free Gemini API key first (Gemini settings below).');
    return;
  }
  const btn = $('ai') as HTMLButtonElement;
  btn.disabled = true;
  const label = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Asking Gemini…';
  try {
    // Render the untouched original into the canvas and send that frame.
    enhancer.render(held.toCanvasImageSource(), params, 1.01, false);
    const res = await aiAutoTune(key, enhancer.canvas, enhancer.canvas.width, enhancer.canvas.height, params);
    applyParams(res.params);
    const note = $('aiNote');
    note.textContent = `✦ ${res.note || 'Settings tuned for this scene.'} (${res.model})`;
    note.hidden = false;
  } catch (e) {
    toast((e as Error).message, true);
    quickRender();
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}

// ---------- wiring ----------

function init() {
  try {
    enhancer = new Enhancer();
  } catch (e) {
    const card = $('empty').querySelector('.empty-card')!;
    card.querySelector('h2')!.textContent = "Your browser can't run LumaFix";
    card.querySelector('p')!.textContent = `${(e as Error).message} Please use Safari on iOS 17 or newer, or a recent Chrome or Safari on a computer.`;
    return;
  }
  if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') {
    toast('This browser lacks video encoding support (WebCodecs). Update to iOS 17+ / a current browser.', true);
  }

  buildPresets();
  buildSliders();

  const fileInput = $('file') as HTMLInputElement;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (f) void openFile(f);
  });

  const time = $('time') as HTMLInputElement;
  time.addEventListener('input', () => {
    previewTime = Number(time.value);
    $('tcur').textContent = fmtTime(previewTime - (video?.info.start ?? 0));
    schedulePreview(90);
  });

  const stage = $('stage');
  const setSplit = (ev: PointerEvent) => {
    const r = enhancer.canvas.getBoundingClientRect();
    split = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    quickRender();
  };
  stage.addEventListener('pointerdown', (ev) => {
    stage.setPointerCapture(ev.pointerId);
    setSplit(ev);
  });
  stage.addEventListener('pointermove', (ev) => {
    if (stage.hasPointerCapture(ev.pointerId)) setSplit(ev);
  });

  const scaleSel = $('scale') as HTMLSelectElement;
  scaleSel.value = scale;
  scaleSel.addEventListener('change', () => {
    scale = scaleSel.value as ScaleChoice;
    store(SCALE_STORAGE, scale);
    updateOutInfo();
  });

  $('reset').addEventListener('click', () => applyParams({ ...DEFAULT_PARAMS }));
  $('export').addEventListener('click', () => void startExport());
  $('cancel').addEventListener('click', () => exportAbort?.abort());
  $('save').addEventListener('click', () => void saveToPhotos());
  $('closeDone').addEventListener('click', () => {
    $('done').hidden = true;
    ($('result') as HTMLVideoElement).pause();
  });
  $('ai').addEventListener('click', () => void runAi());

  const keyInput = $('key') as HTMLInputElement;
  keyInput.value = getGeminiKey();
  $('saveKey').addEventListener('click', () => {
    setGeminiKey(keyInput.value);
    toast(keyInput.value ? 'Gemini key saved on this device.' : 'Gemini key removed.');
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Expose for automated testing.
  (window as unknown as { lumafix: unknown }).lumafix = {
    openFile,
    startExport,
    get params() {
      return params;
    },
    /** Test hook: measured camera shifts for the first n frames. */
    async shifts(n: number) {
      if (!video) return [];
      const out: { dx: number; dy: number; lost: boolean }[] = [];
      enhancer.configure(previewLayout());
      enhancer.reset();
      const { VideoSampleSink } = await import('mediabunny');
      const sink = new VideoSampleSink(video.track);
      for await (const s of sink.samples()) {
        enhancer.render(s.toCanvasImageSource(), params, 0, true);
        s.close();
        out.push({ ...enhancer.lastShift });
        if (out.length >= n) break;
      }
      return out;
    },
  };
}

init();
