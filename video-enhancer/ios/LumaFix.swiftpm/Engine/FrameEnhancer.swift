import CoreImage
import CoreVideo
import Foundation
import Metal

/// Per-frame low-light enhancement on the GPU (Core Image + runtime-compiled Metal kernels).
/// Keeps temporal state between frames, so feed frames in order and call `reset()` on seeks.
final class FrameEnhancer {
    let width: Int
    let height: Int
    let context: CIContext
    private let kernels: Kernels.Set
    private var history: [CVPixelBuffer]
    private var historyIndex = 0
    private let denoised: CVPixelBuffer
    private var hasHistory = false
    private var prevThumb: [Float]?
    private var stateA: Float = 0      // smoothed encoded log luminance
    private var stateRGB = SIMD3<Float>(repeating: 0.2)
    private var hasState = false
    private let thumbW: Int
    private let thumbH: Int
    /// Last measured camera shift in Core Image pixel coordinates (for diagnostics/tests).
    private(set) var lastShift = MotionShift()

    static func makeContext() -> CIContext {
        var options: [CIContextOption: Any] = [
            // Work directly on the video's gamma-encoded values, like the web pipeline.
            .workingColorSpace: NSNull(),
            .outputColorSpace: NSNull(),
            .workingFormat: CIFormat.RGBAh,
            .cacheIntermediates: false,
            .name: "LumaFix",
        ]
        if let device = MTLCreateSystemDefaultDevice() {
            options[.highQualityDownsample] = true
            return CIContext(mtlDevice: device, options: options)
        }
        return CIContext(options: options)
    }

    init(width: Int, height: Int, context: CIContext? = nil) throws {
        self.width = width
        self.height = height
        self.context = context ?? FrameEnhancer.makeContext()
        self.kernels = try Kernels.load()
        self.history = [try Self.makeBuffer(width, height), try Self.makeBuffer(width, height)]
        self.denoised = try Self.makeBuffer(width, height)
        let k = min(1.0, 320.0 / Double(max(width, height)))
        thumbW = max(16, Int(Double(width) * k))
        thumbH = max(16, Int(Double(height) * k))
    }

    func reset() {
        hasHistory = false
        prevThumb = nil
        hasState = false
    }

    static func makeBuffer(_ w: Int, _ h: Int, format: OSType = kCVPixelFormatType_64RGBAHalf) throws -> CVPixelBuffer {
        var pb: CVPixelBuffer?
        let attrs: [String: Any] = [
            kCVPixelBufferMetalCompatibilityKey as String: true,
            kCVPixelBufferIOSurfacePropertiesKey as String: [String: Any](),
        ]
        let status = CVPixelBufferCreate(kCFAllocatorDefault, w, h, format, attrs as CFDictionary, &pb)
        guard status == kCVReturnSuccess, let buffer = pb else {
            throw NSError(domain: "LumaFix", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Could not allocate a \(w)×\(h) frame buffer."])
        }
        return buffer
    }

    func render(_ image: CIImage, to buffer: CVPixelBuffer) throws {
        let dest = CIRenderDestination(pixelBuffer: buffer)
        dest.colorSpace = nil
        _ = try context.startTask(toRender: image, to: dest).waitUntilCompleted()
    }

    private var rect: CGRect { CGRect(x: 0, y: 0, width: width, height: height) }

    /// Enhance one frame. `input` must have extent (0, 0, width, height).
    /// - Parameters:
    ///   - temporalDone: the frame was already temporally denoised (Apple ML filter), skip ours.
    ///   - commit: false re-renders without advancing temporal state (preview tweaks).
    /// - Returns: a lazily-evaluated image at the source size, ready to be scaled and rendered.
    func process(_ input: CIImage, params: EnhanceParams, temporalDone: Bool = false, commit: Bool = true) throws -> CIImage {
        let rect = self.rect
        let src = input.cropped(to: rect)

        // 1. Temporal denoise with camera-motion compensation.
        var temporalImage = src
        if !temporalDone && params.temporalDenoise > 0.001 {
            let thumb = try thumbnail(src)
            var shift = MotionShift()
            if hasHistory, let prev = prevThumb {
                let s = MotionEstimator.estimate(cur: thumb, prev: prev, width: thumbW, height: thumbH)
                // Thumbnail rows are top-down; Core Image's y axis points up.
                shift = MotionShift(dx: s.dx * Double(width) / Double(thumbW), dy: -s.dy * Double(height) / Double(thumbH), lost: s.lost)
            }
            lastShift = shift
            let useHistory = hasHistory && !shift.lost
            let prevHist = CIImage(cvPixelBuffer: history[historyIndex])
            let sx = CGFloat(shift.dx), sy = CGFloat(shift.dy)
            guard let t = kernels.temporal.apply(
                extent: rect,
                roiCallback: { index, r in
                    index == 0 ? r.insetBy(dx: -4, dy: -4) : r.offsetBy(dx: sx, dy: sy).insetBy(dx: -6, dy: -6)
                },
                arguments: [src, prevHist, CIVector(x: sx, y: sy), params.temporalDenoise, useHistory ? Float(1) : Float(0)]
            ) else { throw Self.kernelError("temporal") }
            let next = history[1 - historyIndex]
            try render(t, to: next)
            temporalImage = CIImage(cvPixelBuffer: next)
            if commit {
                historyIndex = 1 - historyIndex
                hasHistory = true
                prevThumb = thumb
            }
        } else if commit {
            hasHistory = false
            prevThumb = nil
        }

        // 2. Spatial denoise; filter harder when we expect to brighten a lot.
        let key = hasState ? decodeLogLum(stateA) : 0.18
        let gain = min(10, max(1, (0.07 + 0.19 * params.brightness) / max(key, 1e-4)))
        guard let s = kernels.spatial.apply(
            extent: rect,
            roiCallback: { _, r in r.insetBy(dx: -5, dy: -5) },
            arguments: [temporalDone ? src.settingAlphaOne(in: rect) : temporalImage, params.spatialDenoise, gain]
        ) else { throw Self.kernelError("spatial") }
        try render(s, to: denoised)
        let den = CIImage(cvPixelBuffer: denoised)

        // 3. Statistics: global (exposure + white balance) and local (adaptation grid).
        guard let stats = kernels.stats.apply(extent: rect, roiCallback: { _, r in r }, arguments: [den]) else {
            throw Self.kernelError("stats")
        }
        let avg = try areaAverage(stats)
        let adapt: Float = hasState ? 0.06 : 1
        let newA = stateA + (avg.w - stateA) * adapt
        let newRGB = stateRGB + (SIMD3(avg.x, avg.y, avg.z) - stateRGB) * adapt
        if commit {
            stateA = newA
            stateRGB = newRGB
            hasState = true
        }
        let (local, spacing) = try localGrid(stats)

        // 4. Tone mapping, colour, sharpening.
        let p = params
        let args: [Any] = [
            den, local, decodeLogLum(newA), CIVector(x: CGFloat(newRGB.x), y: CGFloat(newRGB.y), z: CGFloat(newRGB.z)), spacing,
            p.brightness, p.shadows, p.colorFix, p.saturation, p.sharpen, p.blackPoint, p.contrast,
        ]
        guard let toned = kernels.tone.apply(
            extent: rect,
            roiCallback: { index, r in index == 0 ? r.insetBy(dx: -2, dy: -2) : local.extent },
            arguments: args
        ) else { throw Self.kernelError("tone") }
        return toned
    }

    // MARK: - helpers

    private func decodeLogLum(_ a: Float) -> Float { exp2(a * 16 - 16) }

    private static func kernelError(_ name: String) -> NSError {
        NSError(domain: "LumaFix", code: 2, userInfo: [NSLocalizedDescriptionKey: "Enhancement step '\(name)' failed."])
    }

    private func thumbnail(_ image: CIImage) throws -> [Float] {
        let sx = CGFloat(thumbW) / CGFloat(width)
        let sy = CGFloat(thumbH) / CGFloat(height)
        let small = image.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
            .cropped(to: CGRect(x: 0, y: 0, width: thumbW, height: thumbH))
        var bytes = [UInt8](repeating: 0, count: thumbW * thumbH * 4)
        context.render(small, toBitmap: &bytes, rowBytes: thumbW * 4,
                       bounds: CGRect(x: 0, y: 0, width: thumbW, height: thumbH), format: .RGBA8, colorSpace: nil)
        var out = [Float](repeating: 0, count: thumbW * thumbH)
        for i in 0..<out.count {
            let r = Float(bytes[i * 4]), g = Float(bytes[i * 4 + 1]), b = Float(bytes[i * 4 + 2])
            out[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        }
        return out
    }

    private func areaAverage(_ image: CIImage) throws -> SIMD4<Float> {
        let filter = CIFilter(name: "CIAreaAverage", parameters: [
            kCIInputImageKey: image,
            kCIInputExtentKey: CIVector(cgRect: image.extent),
        ])
        guard let out = filter?.outputImage else { throw Self.kernelError("average") }
        var px = [Float](repeating: 0, count: 4)
        context.render(out, toBitmap: &px, rowBytes: 16, bounds: CGRect(x: 0, y: 0, width: 1, height: 1), format: .RGBAf, colorSpace: nil)
        return SIMD4(px[0], px[1], px[2], px[3])
    }

    /// Low-resolution grid of log luminance (≈1/64 of the frame), materialised once per frame and
    /// scaled back to frame size so the tone kernel can sample it with ordinary coordinates.
    private func localGrid(_ stats: CIImage) throws -> (CIImage, Float) {
        let gw = max(8, width / 64)
        let gh = max(8, height / 64)
        let sx = CGFloat(gw) / CGFloat(width)
        let sy = CGFloat(gh) / CGFloat(height)
        let small = stats.clampedToExtent()
            .applyingGaussianBlur(sigma: 24)
            .transformed(by: CGAffineTransform(scaleX: sx, y: sy))
            .cropped(to: CGRect(x: 0, y: 0, width: gw, height: gh))
        let rowBytes = gw * 8
        var data = Data(count: rowBytes * gh)
        data.withUnsafeMutableBytes { ptr in
            context.render(small, toBitmap: ptr.baseAddress!, rowBytes: rowBytes,
                           bounds: CGRect(x: 0, y: 0, width: gw, height: gh), format: .RGBAh, colorSpace: nil)
        }
        let grid = CIImage(bitmapData: data, bytesPerRow: rowBytes, size: CGSize(width: gw, height: gh), format: .RGBAh, colorSpace: nil)
        let up = grid.clampedToExtent()
            .transformed(by: CGAffineTransform(scaleX: 1 / sx, y: 1 / sy))
            .cropped(to: rect)
        return (up, Float(width) / Float(gw))
    }
}

extension CIImage {
    /// Force alpha to 1 (marks the frame as "fully temporally denoised" for the spatial pass).
    func settingAlphaOne(in rect: CGRect) -> CIImage {
        applyingFilter("CIColorMatrix", parameters: [
            "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0),
            "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        ]).cropped(to: rect)
    }
}
