import type { EnhanceParams } from './params';
import { estimateShift } from './motion';
import { FRAG_FINAL, FRAG_MOTION, FRAG_SPATIAL, FRAG_STATE, FRAG_STATS, FRAG_TEMPORAL, FRAG_TONE, VERT } from './shaders';

type Program = { prog: WebGLProgram; loc: Map<string, WebGLUniformLocation | null> };
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };

export interface FrameLayout {
  /** Coded (stored) frame size. */
  codedWidth: number;
  codedHeight: number;
  /** Clockwise rotation to apply, in degrees. */
  rotation: 0 | 90 | 180 | 270;
  /** Output size (already rotated and scaled). */
  outWidth: number;
  outHeight: number;
}

/**
 * Six-pass WebGL2 low-light enhancement pipeline. Keeps per-video state (temporal history and
 * smoothed exposure), so call reset() on seeks or when switching videos.
 */
export class Enhancer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private halfFloat: boolean;
  private quad: WebGLVertexArrayObject;
  private programs: Record<'motion' | 'temporal' | 'spatial' | 'stats' | 'state' | 'tone' | 'final', Program>;
  private srcTex: WebGLTexture;
  private hist: [Target, Target] | null = null;
  private den: Target | null = null;
  private stats: Target | null = null;
  private state: [Target, Target] | null = null;
  private toned: Target | null = null;
  private motion: Target | null = null;
  private motionRead: { fbo: WebGLFramebuffer; w: number; h: number } | null = null;
  private motionPixels: Uint8Array = new Uint8Array(0);
  private motionPrev: Float32Array | null = null;
  private motionCur: Float32Array | null = null;
  /** Last measured camera shift (display pixels), for diagnostics. */
  lastShift = { dx: 0, dy: 0, lost: false };
  private histIdx = 0;
  private stateIdx = 0;
  private hasHistory = false;
  private layout: FrameLayout | null = null;
  private uploadCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private directUploadOk = true;

  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    this.halfFloat = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.quad = vao;

    this.programs = {
      motion: this.compile(FRAG_MOTION),
      temporal: this.compile(FRAG_TEMPORAL),
      spatial: this.compile(FRAG_SPATIAL),
      stats: this.compile(FRAG_STATS),
      state: this.compile(FRAG_STATE),
      tone: this.compile(FRAG_TONE),
      final: this.compile(FRAG_FINAL),
    };

    this.srcTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    this.setSampling(gl.LINEAR, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  }

  get usesHalfFloat() {
    return this.halfFloat;
  }

  /** (Re)allocate buffers for a new frame geometry. Cheap if nothing changed. */
  configure(layout: FrameLayout) {
    const l = this.layout;
    if (
      l &&
      l.codedWidth === layout.codedWidth &&
      l.codedHeight === layout.codedHeight &&
      l.rotation === layout.rotation &&
      l.outWidth === layout.outWidth &&
      l.outHeight === layout.outHeight
    ) {
      return;
    }
    this.disposeTargets();
    this.layout = { ...layout };
    const swap = layout.rotation === 90 || layout.rotation === 270;
    const w = swap ? layout.codedHeight : layout.codedWidth;
    const h = swap ? layout.codedWidth : layout.codedHeight;
    this.hist = [this.makeTarget(w, h), this.makeTarget(w, h)];
    this.den = this.makeTarget(w, h);
    this.toned = this.makeTarget(w, h);
    this.stats = this.makeTarget(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 8)), true);
    this.state = [this.makeTarget(1, 1), this.makeTarget(1, 1)];
    this.setupMotion(w, h);
    this.canvas.width = layout.outWidth;
    this.canvas.height = layout.outHeight;
    this.reset();
  }

  /** Forget temporal history (call on seek / new clip). */
  reset() {
    this.hasHistory = false;
    this.motionPrev = null;
  }

  /**
   * Enhance one frame and draw it to `this.canvas`.
   * @param split 0 for full enhancement; otherwise the fraction of the width showing the original.
   * @param commit false re-renders without advancing temporal state, so repeated renders of the
   *   same frame (preview tweaks) stay identical instead of slowly losing the denoise history.
   */
  render(source: TexImageSource, params: EnhanceParams, split = 0, commit = true) {
    const gl = this.gl;
    const layout = this.layout;
    if (!layout || !this.hist || !this.den || !this.stats || !this.state || !this.toned) {
      throw new Error('Enhancer.configure() must be called before render().');
    }
    this.upload(source, layout);

    const dw = this.den.w;
    const dh = this.den.h;
    const rot = layout.rotation / 90;
    const histPrev = this.hist[this.histIdx];
    const histNext = this.hist[1 - this.histIdx];

    // 0. Camera motion between the previous frame and this one.
    const shift = this.measureMotion(rot, dw, dh, commit);
    this.lastShift = shift;
    const useHistory = this.hasHistory && !shift.lost;

    // 1. Temporal denoise (history re-aligned to follow the camera)
    this.pass('temporal', histNext, (u) => {
      this.bindTex(0, this.srcTex);
      gl.uniform1i(u('uSrc'), 0);
      this.bindTex(1, histPrev.tex);
      gl.uniform1i(u('uHist'), 1);
      gl.uniform1i(u('uRotation'), rot);
      gl.uniform2f(u('uTexel'), 1 / dw, 1 / dh);
      gl.uniform1f(u('uStrength'), params.temporalDenoise);
      gl.uniform1f(u('uHasHist'), useHistory ? 1 : 0);
      gl.uniform2f(u('uHistShift'), shift.dx / dw, shift.dy / dh);
      gl.uniform2f(u('uSize'), dw, dh);
    });
    if (commit) this.histIdx = 1 - this.histIdx;

    // 2. Spatial denoise
    const statePrev = this.state[this.stateIdx];
    const stateNext = this.state[1 - this.stateIdx];
    this.pass('spatial', this.den, (u) => {
      this.bindTex(0, histNext.tex);
      gl.uniform1i(u('uIn'), 0);
      this.bindTex(1, statePrev.tex);
      gl.uniform1i(u('uState'), 1);
      gl.uniform1f(u('uBrightness'), params.brightness);
      gl.uniform2f(u('uTexel'), 1 / dw, 1 / dh);
      gl.uniform1f(u('uStrength'), params.spatialDenoise);
    });

    // 3. Statistics pyramid
    const stats = this.stats;
    this.pass('stats', stats, (u) => {
      this.bindTex(0, this.den!.tex);
      gl.uniform1i(u('uIn'), 0);
      gl.uniform2f(u('uInTexel'), 1 / dw, 1 / dh);
    });
    gl.bindTexture(gl.TEXTURE_2D, stats.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    const maxLod = Math.floor(Math.log2(Math.max(stats.w, stats.h)));

    // 4. Smoothed global state
    this.pass('state', stateNext, (u) => {
      this.bindTex(0, stats.tex);
      gl.uniform1i(u('uStats'), 0);
      this.bindTex(1, statePrev.tex);
      gl.uniform1i(u('uPrev'), 1);
      gl.uniform1f(u('uMaxLod'), maxLod);
      gl.uniform1f(u('uAdapt'), this.hasHistory ? (shift.lost ? 0.3 : 0.06) : 1.0);
    });
    if (commit) this.stateIdx = 1 - this.stateIdx;

    // 5. Tone / colour / sharpen
    this.pass('tone', this.toned, (u) => {
      this.bindTex(0, this.den!.tex);
      gl.uniform1i(u('uIn'), 0);
      this.bindTex(1, stats.tex);
      gl.uniform1i(u('uStats'), 1);
      this.bindTex(2, stateNext.tex);
      gl.uniform1i(u('uState'), 2);
      gl.uniform2f(u('uTexel'), 1 / dw, 1 / dh);
      gl.uniform2f(u('uStatsTexel'), 1 / stats.w, 1 / stats.h);
      gl.uniform1f(u('uLocalLod'), Math.min(maxLod, 3));
      gl.uniform1f(u('uBrightness'), params.brightness);
      gl.uniform1f(u('uShadows'), params.shadows);
      gl.uniform1f(u('uColorFix'), params.colorFix);
      gl.uniform1f(u('uSaturation'), params.saturation);
      gl.uniform1f(u('uSharpen'), params.sharpen);
      gl.uniform1f(u('uBlack'), params.blackPoint);
      gl.uniform1f(u('uContrast'), params.contrast);
    });

    // 6. Upscale to canvas
    this.pass('final', null, (u) => {
      this.bindTex(0, this.toned!.tex);
      gl.uniform1i(u('uIn'), 0);
      this.bindTex(1, this.srcTex);
      gl.uniform1i(u('uSrc'), 1);
      gl.uniform1i(u('uRotation'), rot);
      gl.uniform2f(u('uInSize'), dw, dh);
      gl.uniform2f(u('uOutSize'), layout.outWidth, layout.outHeight);
      gl.uniform1f(u('uSplit'), split);
    });

    if (commit) this.hasHistory = true;
  }

  dispose() {
    this.disposeTargets();
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  // --- internals -----------------------------------------------------------------------------

  private setupMotion(w: number, h: number) {
    const gl = this.gl;
    const mw = Math.max(8, Math.round(w / 4));
    const mh = Math.max(8, Math.round(h / 4));
    this.motion = this.makeTarget(mw, mh, true, true);
    // Read back from the smallest mip level that is still at least ~240 px wide.
    let level = 0;
    while ((mw >> (level + 1)) >= 240 && (mh >> (level + 1)) >= 48) level++;
    const rw = Math.max(1, mw >> level);
    const rh = Math.max(1, mh >> level);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.motion.tex, level);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.motionRead = { fbo, w: rw, h: rh };
    this.motionPixels = new Uint8Array(rw * rh * 4);
    this.motionPrev = null;
    this.motionCur = null;
  }

  /** Returns the camera shift in display pixels (cur(x) ≈ prev(x + shift)). */
  private measureMotion(rot: number, dw: number, dh: number, commit: boolean) {
    const gl = this.gl;
    const m = this.motion!;
    const r = this.motionRead!;
    this.pass('motion', m, (u) => {
      this.bindTex(0, this.srcTex);
      gl.uniform1i(u('uSrc'), 0);
      gl.uniform1i(u('uRotation'), rot);
      gl.uniform2f(u('uTexel'), 1 / dw, 1 / dh);
    });
    gl.bindTexture(gl.TEXTURE_2D, m.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo);
    gl.readPixels(0, 0, r.w, r.h, gl.RGBA, gl.UNSIGNED_BYTE, this.motionPixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const cur = this.motionCur && this.motionCur.length === r.w * r.h ? this.motionCur : new Float32Array(r.w * r.h);
    for (let i = 0; i < cur.length; i++) cur[i] = this.motionPixels[i * 4] / 255;

    let shift = { dx: 0, dy: 0, lost: false };
    if (this.motionPrev && this.hasHistory) {
      const s = estimateShift(cur, this.motionPrev, r.w, r.h);
      shift = { dx: s.dx * (dw / r.w), dy: s.dy * (dh / r.h), lost: s.lost };
    }
    if (commit) {
      // Swap buffers: current becomes previous.
      this.motionCur = this.motionPrev;
      this.motionPrev = cur;
    } else {
      this.motionCur = cur;
    }
    return shift;
  }

  private upload(source: TexImageSource, layout: FrameLayout) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    if (this.directUploadOk) {
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
        return;
      } catch {
        this.directUploadOk = false;
      }
    }
    // Fallback for browsers that cannot upload a VideoFrame directly.
    if (!this.uploadCanvas) {
      this.uploadCanvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(layout.codedWidth, layout.codedHeight)
          : Object.assign(document.createElement('canvas'), { width: layout.codedWidth, height: layout.codedHeight });
    }
    const c = this.uploadCanvas;
    if (c.width !== layout.codedWidth || c.height !== layout.codedHeight) {
      c.width = layout.codedWidth;
      c.height = layout.codedHeight;
    }
    const ctx = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    ctx.drawImage(source as CanvasImageSource, 0, 0, c.width, c.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c as TexImageSource);
  }

  private pass(name: keyof Enhancer['programs'], target: Target | null, setup: (u: (n: string) => WebGLUniformLocation | null) => void) {
    const gl = this.gl;
    const p = this.programs[name];
    gl.useProgram(p.prog);
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.w, target.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    setup((n) => {
      if (!p.loc.has(n)) p.loc.set(n, gl.getUniformLocation(p.prog, n));
      return p.loc.get(n)!;
    });
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private bindTex(unit: number, tex: WebGLTexture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }

  private setSampling(min: number, mag: number) {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private makeTarget(w: number, h: number, mipmapped = false, force8 = false): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const levels = mipmapped ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
    gl.texStorage2D(gl.TEXTURE_2D, levels, this.halfFloat && !force8 ? gl.RGBA16F : gl.RGBA8, w, h);
    this.setSampling(mipmapped ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR, gl.LINEAR);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      if (this.halfFloat && !force8) {
        // Some GPUs advertise the extension but refuse the format; retry everything in 8-bit.
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(tex);
        this.halfFloat = false;
        return this.makeTarget(w, h, mipmapped, force8);
      }
      throw new Error(`Framebuffer incomplete (${status})`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  }

  private disposeTargets() {
    const gl = this.gl;
    const all = [...(this.hist ?? []), this.den, this.stats, ...(this.state ?? []), this.toned, this.motion];
    if (this.motionRead) gl.deleteFramebuffer(this.motionRead.fbo);
    this.motionRead = null;
    this.motion = null;
    this.motionPrev = this.motionCur = null;
    for (const t of all) {
      if (!t) continue;
      gl.deleteFramebuffer(t.fbo);
      gl.deleteTexture(t.tex);
    }
    this.hist = this.den = this.stats = this.state = this.toned = null;
  }

  private compile(frag: string): Program {
    const gl = this.gl;
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(s));
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(prog));
    }
    return { prog, loc: new Map() };
  }
}
