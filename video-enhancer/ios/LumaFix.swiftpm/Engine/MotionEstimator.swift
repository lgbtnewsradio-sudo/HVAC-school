import Foundation

/// Global (camera) motion between consecutive frames, measured on small grayscale thumbnails.
/// Port of web/src/motion.ts.
struct MotionShift {
    /// In thumbnail pixels, image rows top-down: cur(x) ≈ prev(x + dx).
    var dx: Double = 0
    var dy: Double = 0
    /// Frames don't match at any shift (scene cut / whip pan): drop history.
    var lost = false
}

enum MotionEstimator {
    private static func mean(_ a: [Float]) -> Float {
        var s: Float = 0
        for v in a { s += v }
        return s / Float(max(a.count, 1))
    }

    private static func downsample2(_ src: [Float], _ w: Int, _ h: Int) -> ([Float], Int, Int) {
        let w2 = w / 2, h2 = h / 2
        var out = [Float](repeating: 0, count: w2 * h2)
        for y in 0..<h2 {
            let r0 = 2 * y * w, r1 = r0 + w
            for x in 0..<w2 {
                let i = 2 * x
                out[y * w2 + x] = (src[r0 + i] + src[r0 + i + 1] + src[r1 + i] + src[r1 + i + 1]) * 0.25
            }
        }
        return (out, w2, h2)
    }

    private static func sad(_ cur: [Float], _ prev: [Float], _ w: Int, _ h: Int, _ dx: Int, _ dy: Int, _ margin: Int, _ bias: Float) -> Float {
        var s: Float = 0
        var n = 0
        let step = w * h > 6000 ? 2 : 1
        var y = margin
        cur.withUnsafeBufferPointer { c in
            prev.withUnsafeBufferPointer { p in
                while y < h - margin {
                    let rc = y * w
                    let rp = (y + dy) * w + dx
                    var x = margin
                    while x < w - margin {
                        s += abs(c[rc + x] - p[rp + x] - bias)
                        n += 1
                        x += step
                    }
                    y += step
                }
            }
        }
        return s / Float(max(n, 1))
    }

    private static func parabola(_ l: Float, _ c: Float, _ r: Float) -> Double {
        let d = l - 2 * c + r
        if d <= 1e-9 { return 0 }
        return Double(max(-0.5, min(0.5, 0.5 * (l - r) / d)))
    }

    static func estimate(cur: [Float], prev: [Float], width w: Int, height h: Int) -> MotionShift {
        guard w >= 16, h >= 16, cur.count == w * h, prev.count == w * h else { return MotionShift(lost: true) }
        let bias = mean(cur) - mean(prev)
        let (c1, w1, h1) = downsample2(cur, w, h)
        let (p1, _, _) = downsample2(prev, w, h)

        let r1 = max(4, Int((Double(w1) * 0.08).rounded()))
        var best = Float.infinity
        var bx = 0, by = 0
        for dy in -r1...r1 {
            for dx in -r1...r1 {
                let v = sad(c1, p1, w1, h1, dx, dy, r1, bias)
                if v < best { best = v; bx = dx; by = dy }
            }
        }

        let margin = 2 * r1 + 2
        var fx = 2 * bx, fy = 2 * by
        var fb = Float.infinity
        var cache: [Int: Float] = [:]
        func at(_ dx: Int, _ dy: Int) -> Float {
            let k = (dy + 1000) * 4096 + (dx + 1000)
            if let v = cache[k] { return v }
            let v = sad(cur, prev, w, h, dx, dy, margin, bias)
            cache[k] = v
            return v
        }
        let cx = fx, cy = fy
        for dy in (cy - 2)...(cy + 2) {
            for dx in (cx - 2)...(cx + 2) {
                let v = at(dx, dy)
                if v < fb { fb = v; fx = dx; fy = dy }
            }
        }
        let zero = at(0, 0)

        let atEdge = abs(fx) >= 2 * r1 || abs(fy) >= 2 * r1
        if fb > 0.09 || atEdge { return MotionShift(lost: true) }
        if (fx != 0 || fy != 0) && fb > zero * 0.97 {
            fx = 0; fy = 0; fb = zero
        }
        var dx = Double(fx) + parabola(at(fx - 1, fy), fb, at(fx + 1, fy))
        var dy = Double(fy) + parabola(at(fx, fy - 1), fb, at(fx, fy + 1))
        if abs(dx) < 0.06 { dx = 0 }
        if abs(dy) < 0.06 { dy = 0 }
        return MotionShift(dx: dx, dy: dy, lost: false)
    }
}
