// GLSL ES 3.00 shaders for the low-light enhancement pipeline.
//
// Convention: every intermediate texture stores the image with row 0 = top of the picture, and
// is addressed with vUV in [0,1]^2 where vUV.y = 0 is the top. Only the final pass flips for the
// canvas. All intermediates are in display orientation; the source texture is in coded
// orientation and is rotated on read.

export const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUV;
void main() {
  vUV = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUV;
out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 toLinear(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 toGamma(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
// log2 luminance packed into 0..1 so it survives 8-bit targets and averages geometrically.
float encodeLogLum(float y) { return clamp((log2(max(y, 1e-5)) + 16.0) / 16.0, 0.0, 1.0); }
float decodeLogLum(float a) { return exp2(a * 16.0 - 16.0); }

vec3 catmullRom(sampler2D tex, vec2 uv, vec2 size) {
  vec2 p = uv * size;
  vec2 t1 = floor(p - 0.5) + 0.5;
  vec2 f = p - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t12 = (t1 + w2 / w12) / size;
  vec2 t0 = (t1 - 1.0) / size;
  vec2 t3 = (t1 + 2.0) / size;
  vec3 r = vec3(0.0);
  r += texture(tex, vec2(t0.x, t0.y)).rgb * w0.x * w0.y;
  r += texture(tex, vec2(t12.x, t0.y)).rgb * w12.x * w0.y;
  r += texture(tex, vec2(t3.x, t0.y)).rgb * w3.x * w0.y;
  r += texture(tex, vec2(t0.x, t12.y)).rgb * w0.x * w12.y;
  r += texture(tex, vec2(t12.x, t12.y)).rgb * w12.x * w12.y;
  r += texture(tex, vec2(t3.x, t12.y)).rgb * w3.x * w12.y;
  r += texture(tex, vec2(t0.x, t3.y)).rgb * w0.x * w3.y;
  r += texture(tex, vec2(t12.x, t3.y)).rgb * w12.x * w3.y;
  r += texture(tex, vec2(t3.x, t3.y)).rgb * w3.x * w3.y;
  return clamp(r, 0.0, 1.0);
}

`;

const SRC_SAMPLER = /* glsl */ `
uniform sampler2D uSrc;
uniform int uRotation; // clockwise degrees / 90
vec2 srcUV(vec2 d) {
  if (uRotation == 1) return vec2(d.y, 1.0 - d.x);
  if (uRotation == 2) return vec2(1.0 - d.x, 1.0 - d.y);
  if (uRotation == 3) return vec2(1.0 - d.y, d.x);
  return d;
}
vec3 srcAt(vec2 d) { return texture(uSrc, srcUV(d)).rgb; }
`;

/** Pass 1: motion-adaptive temporal denoise against the running history. */
export const FRAG_TEMPORAL = COMMON + SRC_SAMPLER + /* glsl */ `
uniform sampler2D uHist;
uniform vec2 uTexel;      // 1 / display size
uniform float uStrength;  // 0..1
uniform float uHasHist;
uniform vec2 uHistShift;  // global camera motion (uv units): where this pixel was last frame
uniform vec2 uSize;       // display size in pixels
void main() {
  vec3 c = srcAt(vUV);
  vec2 hv = vUV + uHistShift;
  bool inside = all(greaterThanEqual(hv, vec2(0.0))) && all(lessThanEqual(hv, vec2(1.0)));
  // Alpha carries "how much temporal averaging happened" so the spatial pass can compensate.
  if (uHasHist < 0.5 || uStrength <= 0.001 || !inside) { outColor = vec4(c, 0.0); return; }

  vec2 a = uTexel * vec2(0.75, 0.75);
  vec2 b = uTexel * vec2(0.75, -0.75);
  vec3 c1 = srcAt(vUV + a), c2 = srcAt(vUV - a), c3 = srcAt(vUV + b), c4 = srcAt(vUV - b);
  // Bicubic fetch when the history moved by a fraction of a pixel, so it doesn't blur over time.
  vec3 h  = uHistShift == vec2(0.0) ? texture(uHist, hv).rgb : catmullRom(uHist, hv, uSize);
  vec3 h1 = texture(uHist, hv + a).rgb, h2 = texture(uHist, hv - a).rgb;
  vec3 h3 = texture(uHist, hv + b).rgb, h4 = texture(uHist, hv - b).rgb;

  // Compare blurred neighbourhoods so random grain is not mistaken for motion.
  vec3 cb = (c1 + c2 + c3 + c4 + c) * 0.2;
  vec3 hb = (h1 + h2 + h3 + h4 + h) * 0.2;
  vec3 dd = abs(cb - hb);
  float d = max(max(dd.r, dd.g), dd.b);

  float thr = mix(0.012, 0.05, uStrength);
  float w = mix(0.5, 0.92, uStrength) * (1.0 - smoothstep(thr * 0.6, thr * 2.2, d));

  // Clamp history to the current neighbourhood (plus a noise margin) to stop ghost trails.
  vec3 mn = min(min(min(c1, c2), min(c3, c4)), c) - thr;
  vec3 mx = max(max(max(c1, c2), max(c3, c4)), c) + thr;
  h = clamp(h, mn, mx);

  outColor = vec4(mix(c, h, w), w);
}`;

/** Pass 2: edge-aware bilateral filter in YCbCr; chroma gets a wider, stronger filter. */
export const FRAG_SPATIAL = COMMON + /* glsl */ `
uniform sampler2D uIn;
uniform sampler2D uState;   // previous frame's global stats, to predict the brightening gain
uniform vec2 uTexel;
uniform float uStrength;
uniform float uBrightness;
vec3 toYCC(vec3 c) { float y = dot(c, vec3(0.299, 0.587, 0.114)); return vec3(y, (c.b - y) * 0.564, (c.r - y) * 0.713); }
vec3 fromYCC(vec3 q) {
  float r = q.x + 1.403 * q.z;
  float b = q.x + 1.773 * q.y;
  float g = (q.x - 0.299 * r - 0.114 * b) / 0.587;
  return vec3(r, g, b);
}
void main() {
  vec4 center = texture(uIn, vUV);
  vec3 q0 = toYCC(center.rgb);
  if (uStrength <= 0.001) { outColor = vec4(fromYCC(q0), 1.0); return; }
  // Where temporal averaging couldn't help (moving things, newly revealed areas), filter harder.
  float temporalHelp = clamp(center.a / 0.8, 0.0, 1.0);
  float boost = mix(1.7, 1.0, temporalHelp);
  // Noise gets multiplied by the exposure gain later, so filter harder on very dark footage.
  float key = decodeLogLum(texture(uState, vec2(0.5)).a);
  float gain = clamp(mix(0.07, 0.26, uBrightness) / max(key, 1e-4), 1.0, 10.0);
  float sL = mix(0.012, 0.06, uStrength) * clamp(sqrt(gain) * 0.6, 0.7, 1.7) * boost;
  float invL = 1.0 / (2.0 * sL * sL);
  float invC = 1.0 / (2.0 * (sL * 3.0) * (sL * 3.0));
  vec2 step = uTexel * 1.6;
  float wy = 0.0, wc = 0.0, sy = 0.0;
  vec2 sc = vec2(0.0);
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 o = vec2(float(i), float(j));
      vec3 q = toYCC(texture(uIn, vUV + o * step).rgb);
      float ds = dot(o, o);
      float dy = q.x - q0.x;
      float r2 = dy * dy;
      float wl = exp(-ds * 0.3 - r2 * invL);
      float wch = exp(-ds * 0.08 - r2 * invC);
      sy += q.x * wl; wy += wl;
      sc += q.yz * wch; wc += wch;
    }
  }
  float y = mix(q0.x, sy / wy, min(1.0, 0.85 * uStrength * boost));
  vec2 cc = mix(q0.yz, sc / wc, min(1.0, uStrength * 1.4));
  outColor = vec4(fromYCC(vec3(y, cc)), 1.0);
}`;

/** Pass 3: downsampled statistics image (gamma RGB + log luminance), mipmapped afterwards. */
export const FRAG_STATS = COMMON + /* glsl */ `
uniform sampler2D uIn;
uniform vec2 uInTexel;
void main() {
  vec2 o = uInTexel * 2.0;
  vec3 c = (texture(uIn, vUV + vec2(-o.x, -o.y)).rgb + texture(uIn, vUV + vec2(o.x, -o.y)).rgb +
            texture(uIn, vUV + vec2(-o.x, o.y)).rgb + texture(uIn, vUV + vec2(o.x, o.y)).rgb) * 0.25;
  float y = dot(toLinear(c), LUMA);
  outColor = vec4(c, encodeLogLum(y));
}`;

/** Pass 4: temporally smoothed global statistics (1x1), prevents exposure flicker. */
export const FRAG_STATE = COMMON + /* glsl */ `
uniform sampler2D uStats;
uniform sampler2D uPrev;
uniform float uMaxLod;
uniform float uAdapt; // 0..1, 1 = no smoothing
void main() {
  vec4 m = textureLod(uStats, vec2(0.5), uMaxLod);
  vec4 p = texture(uPrev, vec2(0.5));
  outColor = mix(p, m, uAdapt);
}`;

/** Pass 5: exposure, local tone mapping, white balance, colour and sharpening. */
export const FRAG_TONE = COMMON + /* glsl */ `
uniform sampler2D uIn;
uniform sampler2D uStats;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uLocalLod;
uniform vec2 uStatsTexel;
uniform float uBrightness, uShadows, uColorFix, uSaturation, uSharpen, uBlack, uContrast;

// Edge-aware local adaptation: a cross-bilateral average of the low-res log-luminance grid,
// weighted by similarity to this pixel's own brightness. A plain blur would bleed bright areas
// into dark ones and cause the halos typical of cheap "shadow lift" filters.
float localLogLum(vec2 uv, float selfA) {
  vec2 o = uStatsTexel * exp2(uLocalLod);
  float sum = 0.0, wsum = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      float a = textureLod(uStats, uv + vec2(float(i), float(j)) * o, uLocalLod).a;
      float d = (a - selfA) * 16.0; // difference in stops
      float w = exp(-d * d * 0.5) * (i == 0 && j == 0 ? 1.5 : 1.0);
      sum += a * w;
      wsum += w;
    }
  }
  return sum / max(wsum, 1e-4);
}

void main() {
  vec3 c = texture(uIn, vUV).rgb;

  // Contrast-adaptive sharpening on the cross neighbourhood.
  if (uSharpen > 0.001) {
    vec3 n = texture(uIn, vUV + vec2(0.0, -uTexel.y)).rgb;
    vec3 s = texture(uIn, vUV + vec2(0.0, uTexel.y)).rgb;
    vec3 e = texture(uIn, vUV + vec2(uTexel.x, 0.0)).rgb;
    vec3 w = texture(uIn, vUV + vec2(-uTexel.x, 0.0)).rgb;
    vec3 mn = min(min(min(n, s), min(e, w)), c);
    vec3 mx = max(max(max(n, s), max(e, w)), c);
    vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, vec3(1e-4)), 0.0, 1.0));
    vec3 detail = c - (n + s + e + w) * 0.25;
    c = clamp(c + detail * amp * uSharpen * 2.2, 0.0, 1.0);
  }

  vec3 lin = toLinear(c);

  // Black point: noisy low-light blacks sit well above zero.
  float bp = uBlack * 0.012;
  lin = max(lin - bp, 0.0) / (1.0 - bp);

  vec4 g = texture(uState, vec2(0.5));
  float key = decodeLogLum(g.a);

  // Gray-world white balance, partially applied and clamped.
  vec3 meanLin = max(toLinear(g.rgb), vec3(1e-4));
  float meanY = dot(meanLin, LUMA);
  vec3 wb = clamp(meanY / meanLin, vec3(0.6), vec3(1.7));
  lin *= mix(vec3(1.0), wb, uColorFix * 0.85);

  // Global exposure toward a target key; only gentle darkening allowed.
  float target = mix(0.07, 0.26, uBrightness);
  float gGlobal = clamp(target / max(key, 1e-4), 0.85, 10.0);

  // Local adaptation: lift regions darker than the frame's key more than bright ones.
  float selfA = textureLod(uStats, vUV, 0.0).a;
  float la = max(decodeLogLum(localLogLum(vUV, selfA)), 1e-5);
  float gLocal = clamp(pow(key / la, uShadows * 0.55), 0.6, 3.5);

  float gain = min(gGlobal * gLocal, 14.0);
  lin *= gain;

  // Hue-preserving highlight shoulder.
  float Y = dot(lin, LUMA);
  float s0 = 0.62;
  float Yc = Y < s0 ? Y : s0 + (1.0 - s0) * (1.0 - exp(-(Y - s0) / (1.0 - s0)));
  lin *= Yc / max(Y, 1e-5);
  // Gently desaturate anything still above white instead of clipping to neon.
  float peak = max(max(lin.r, lin.g), lin.b);
  if (peak > 1.0) lin = mix(vec3(Yc), lin, (1.0 - Yc) / max(peak - Yc, 1e-4));

  lin = max(mix(vec3(Yc), lin, uSaturation), 0.0);

  vec3 o = toGamma(lin);
  vec3 sc = o * o * (3.0 - 2.0 * o);
  o = mix(o, sc, uContrast * 0.45);
  outColor = vec4(o, 1.0);
}`;

/** Pass 6: Catmull-Rom upscale to the output size, before/after split, dither, flip for canvas. */
export const FRAG_FINAL = COMMON + SRC_SAMPLER + /* glsl */ `
uniform sampler2D uIn;
uniform vec2 uInSize;
uniform float uSplit; // 0 = all enhanced; x < uSplit shows the original
uniform vec2 uOutSize;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vec2(vUV.x, 1.0 - vUV.y);
  vec3 c;
  if (uv.x < uSplit) {
    c = srcAt(uv);
  } else {
    c = catmullRom(uIn, uv, uInSize);
  }
  if (uSplit > 0.0) {
    float px = abs(uv.x - uSplit) * uOutSize.x;
    c = mix(c, vec3(1.0), 1.0 - smoothstep(1.0, 2.5, px));
  }
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(c, 1.0);
}`;

/** Motion analysis: small grayscale copy of the (rotated) source for global motion estimation. */
export const FRAG_MOTION = COMMON + SRC_SAMPLER + /* glsl */ `
uniform vec2 uTexel; // display texel
void main() {
  vec2 o = uTexel * 1.0;
  vec3 c = (srcAt(vUV + vec2(-o.x, -o.y)) + srcAt(vUV + vec2(o.x, -o.y)) + srcAt(vUV + vec2(-o.x, o.y)) + srcAt(vUV + vec2(o.x, o.y))) * 0.25;
  outColor = vec4(vec3(dot(c, vec3(0.299, 0.587, 0.114))), 1.0);
}`;
