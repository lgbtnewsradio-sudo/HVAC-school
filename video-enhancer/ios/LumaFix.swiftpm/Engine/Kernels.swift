import CoreImage
import Foundation

/// Core Image kernels written in Metal Shading Language and compiled at runtime as
/// `[[stitchable]]` functions
/// (`CIKernel.kernels(withMetalString:)`, iOS 17+). Runtime compilation keeps the project a
/// plain Swift package that opens in Swift Playgrounds, which cannot build .metal files.
///
/// The maths matches the web app's GLSL pipeline (web/src/shaders.ts).
enum Kernels {
    struct Set {
        let temporal: CIKernel
        let spatial: CIKernel
        let stats: CIKernel
        let tone: CIKernel
    }

    static func load() throws -> Set {
        let kernels = try CIKernel.kernels(withMetalString: source)
        func find(_ name: String) throws -> CIKernel {
            guard let k = kernels.first(where: { $0.name == name }) else {
                throw NSError(domain: "LumaFix", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing kernel \(name)"])
            }
            return k
        }
        return Set(
            temporal: try find("lfTemporal"),
            spatial: try find("lfSpatial"),
            stats: try find("lfStats"),
            tone: try find("lfTone")
        )
    }

    static let source = #"""
#include <CoreImage/CoreImage.h>
using namespace metal;

constant float3 LUMA = float3(0.2126, 0.7152, 0.0722);

static float3 toLinear(float3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c / 12.92, pow((c + 0.055) / 1.055, float3(2.4)), step(float3(0.04045), c));
}
static float3 toGamma(float3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, float3(1.0 / 2.4)) - 0.055, step(float3(0.0031308), c));
}
static float encodeLogLum(float y) { return clamp((log2(max(y, 1e-5)) + 16.0) / 16.0, 0.0, 1.0); }
static float decodeLogLum(float a) { return exp2(a * 16.0 - 16.0); }

static float3 at(coreimage::sampler s, float2 p) { return s.sample(s.transform(p)).rgb; }

static float3 catmullRom(coreimage::sampler s, float2 p) {
    // p in working-space pixels (pixel centres at .5)
    float2 t1 = floor(p - 0.5) + 0.5;
    float2 f = p - t1;
    float2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
    float2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
    float2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
    float2 w3 = f * f * (-0.5 + 0.5 * f);
    float2 w12 = w1 + w2;
    float2 t12 = t1 + w2 / w12;
    float2 t0 = t1 - 1.0;
    float2 t3 = t1 + 2.0;
    float3 r = float3(0.0);
    r += at(s, float2(t0.x, t0.y)) * w0.x * w0.y;
    r += at(s, float2(t12.x, t0.y)) * w12.x * w0.y;
    r += at(s, float2(t3.x, t0.y)) * w3.x * w0.y;
    r += at(s, float2(t0.x, t12.y)) * w0.x * w12.y;
    r += at(s, float2(t12.x, t12.y)) * w12.x * w12.y;
    r += at(s, float2(t3.x, t12.y)) * w3.x * w12.y;
    r += at(s, float2(t0.x, t3.y)) * w0.x * w3.y;
    r += at(s, float2(t12.x, t3.y)) * w12.x * w3.y;
    r += at(s, float2(t3.x, t3.y)) * w3.x * w3.y;
    return clamp(r, 0.0, 1.0);
}

// 1. Motion-compensated temporal denoise. Alpha = how much history was used.
[[stitchable]] float4 lfTemporal(coreimage::sampler cur, coreimage::sampler hist, float2 shift, float strength, float hasHist, coreimage::destination dest) {
    float2 p = dest.coord();
    float3 c = at(cur, p);
    float2 hp = p + shift;
    float4 e = hist.extent();
    bool inside = hp.x >= e.x && hp.y >= e.y && hp.x <= e.x + e.z && hp.y <= e.y + e.w;
    if (hasHist < 0.5 || strength <= 0.001 || !inside) return float4(c, 0.0);

    float2 a = float2(0.75, 0.75);
    float2 b = float2(0.75, -0.75);
    float3 c1 = at(cur, p + a), c2 = at(cur, p - a), c3 = at(cur, p + b), c4 = at(cur, p - b);
    float3 h = (shift.x == 0.0 && shift.y == 0.0) ? at(hist, hp) : catmullRom(hist, hp);
    float3 h1 = at(hist, hp + a), h2 = at(hist, hp - a), h3 = at(hist, hp + b), h4 = at(hist, hp - b);

    float3 cb = (c1 + c2 + c3 + c4 + c) * 0.2;
    float3 hb = (h1 + h2 + h3 + h4 + h) * 0.2;
    float3 dd = abs(cb - hb);
    float d = max(max(dd.r, dd.g), dd.b);

    float thr = mix(0.012, 0.05, strength);
    float w = mix(0.5, 0.92, strength) * (1.0 - smoothstep(thr * 0.6, thr * 2.2, d));

    float3 mn = min(min(min(c1, c2), min(c3, c4)), c) - thr;
    float3 mx = max(max(max(c1, c2), max(c3, c4)), c) + thr;
    h = clamp(h, mn, mx);
    return float4(mix(c, h, w), w);
}

// 2. Edge-aware bilateral denoise in YCbCr; stronger where temporal averaging couldn't help.
[[stitchable]] float4 lfSpatial(coreimage::sampler src, float strength, float gain, coreimage::destination dest) {
    float2 p = dest.coord();
    float4 center = src.sample(src.transform(p));
    float3 c0 = center.rgb;
    float y0 = dot(c0, float3(0.299, 0.587, 0.114));
    float2 cc0 = float2((c0.b - y0) * 0.564, (c0.r - y0) * 0.713);
    if (strength <= 0.001) return float4(c0, 1.0);

    float temporalHelp = clamp(center.a / 0.8, 0.0, 1.0);
    float boost = mix(1.7, 1.0, temporalHelp);
    float sL = mix(0.012, 0.06, strength) * clamp(sqrt(gain) * 0.6, 0.7, 1.7) * boost;
    float invL = 1.0 / (2.0 * sL * sL);
    float invC = 1.0 / (2.0 * (sL * 3.0) * (sL * 3.0));

    float wy = 0.0, wc = 0.0, sy = 0.0;
    float2 sc = float2(0.0);
    for (int j = -2; j <= 2; j++) {
        for (int i = -2; i <= 2; i++) {
            float2 o = float2(float(i), float(j));
            float3 c = at(src, p + o * 1.6);
            float y = dot(c, float3(0.299, 0.587, 0.114));
            float2 cc = float2((c.b - y) * 0.564, (c.r - y) * 0.713);
            float ds = dot(o, o);
            float dy = y - y0;
            float r2 = dy * dy;
            float wl = exp(-ds * 0.3 - r2 * invL);
            float wch = exp(-ds * 0.08 - r2 * invC);
            sy += y * wl; wy += wl;
            sc += cc * wch; wc += wch;
        }
    }
    float y = mix(y0, sy / wy, min(1.0, 0.85 * strength * boost));
    float2 cc = mix(cc0, sc / wc, min(1.0, strength * 1.4));
    float r = y + 1.403 * cc.y;
    float bl = y + 1.773 * cc.x;
    float g = (y - 0.299 * r - 0.114 * bl) / 0.587;
    return float4(r, g, bl, 1.0);
}

// 3. Statistics image: gamma RGB + encoded log luminance.
[[stitchable]] float4 lfStats(coreimage::sampler src, coreimage::destination dest) {
    float3 c = at(src, dest.coord());
    return float4(c, encodeLogLum(dot(toLinear(c), LUMA)));
}

// 4. Exposure, edge-aware local tone mapping, white balance, colour, sharpening.
//    `local` is the low-res stats image scaled back up to frame size; `spacing` its texel size in pixels.
[[stitchable]] float4 lfTone(coreimage::sampler src, coreimage::sampler local, float key, float3 meanRGB, float spacing,
              float brightness, float shadows, float colorFix, float saturation,
              float sharpen, float blackPoint, float contrast, coreimage::destination dest) {
    float2 p = dest.coord();
    float3 c = at(src, p);

    if (sharpen > 0.001) {
        float3 n = at(src, p + float2(0.0, 1.0));
        float3 s = at(src, p - float2(0.0, 1.0));
        float3 e = at(src, p + float2(1.0, 0.0));
        float3 w = at(src, p - float2(1.0, 0.0));
        float3 mn = min(min(min(n, s), min(e, w)), c);
        float3 mx = max(max(max(n, s), max(e, w)), c);
        float3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, float3(1e-4)), 0.0, 1.0));
        float3 detail = c - (n + s + e + w) * 0.25;
        c = clamp(c + detail * amp * sharpen * 2.2, 0.0, 1.0);
    }

    float3 lin = toLinear(c);
    float bp = blackPoint * 0.012;
    lin = max(lin - bp, 0.0) / (1.0 - bp);

    float3 meanLin = max(toLinear(meanRGB), float3(1e-4));
    float meanY = dot(meanLin, LUMA);
    float3 wb = clamp(meanY / meanLin, float3(0.6), float3(1.7));
    lin *= mix(float3(1.0), wb, colorFix * 0.85);

    float target = mix(0.07, 0.26, brightness);
    float gGlobal = clamp(target / max(key, 1e-4), 0.85, 10.0);

    // Cross-bilateral average of the local log-luminance grid (avoids halos).
    float selfA = local.sample(local.transform(p)).a;
    float sum = 0.0, wsum = 0.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            float a = local.sample(local.transform(p + float2(float(i), float(j)) * spacing)).a;
            float d = (a - selfA) * 16.0;
            float ww = exp(-d * d * 0.5) * ((i == 0 && j == 0) ? 1.5 : 1.0);
            sum += a * ww;
            wsum += ww;
        }
    }
    float la = max(decodeLogLum(sum / max(wsum, 1e-4)), 1e-5);
    float gLocal = clamp(pow(key / la, shadows * 0.55), 0.6, 3.5);
    lin *= min(gGlobal * gLocal, 14.0);

    float Y = dot(lin, LUMA);
    float s0 = 0.62;
    float Yc = Y < s0 ? Y : s0 + (1.0 - s0) * (1.0 - exp(-(Y - s0) / (1.0 - s0)));
    lin *= Yc / max(Y, 1e-5);
    float peak = max(max(lin.r, lin.g), lin.b);
    if (peak > 1.0) lin = mix(float3(Yc), lin, (1.0 - Yc) / max(peak - Yc, 1e-4));
    lin = max(mix(float3(Yc), lin, saturation), 0.0);

    float3 o = toGamma(lin);
    float3 scurve = o * o * (3.0 - 2.0 * o);
    o = mix(o, scurve, contrast * 0.45);
    return float4(o, 1.0);
}

"""#
}
