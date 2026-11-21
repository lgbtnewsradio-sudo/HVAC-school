import AVFoundation
import CoreImage
import Foundation

/// Renders a before/after still for the editor. Decodes a short run-up before the chosen time so
/// the temporal denoiser has history and the preview matches the final export.
/// Used from one serial queue at a time.
final class PreviewRenderer: @unchecked Sendable {
    let source: VideoSource
    private let maxDimension: CGFloat
    private var enhancer: FrameEnhancer?
    private let context = FrameEnhancer.makeContext()
    private let srgb = CGColorSpace(name: CGColorSpace.sRGB)!

    init(source: VideoSource, maxDimension: CGFloat = 1600) {
        self.source = source
        self.maxDimension = maxDimension
    }

    var previewSize: (Int, Int) {
        let k = min(1, maxDimension / max(source.size.width, source.size.height))
        func even(_ v: CGFloat) -> Int { max(2, Int((v * k / 2).rounded()) * 2) }
        return (even(source.size.width), even(source.size.height))
    }

    struct Frames {
        let original: CGImage
        let enhanced: CGImage
    }

    func render(at seconds: Double, params: EnhanceParams) throws -> Frames {
        let (w, h) = previewSize
        if enhancer == nil { enhancer = try FrameEnhancer(width: w, height: h, context: context) }
        guard let enhancer else { throw NSError(domain: "LumaFix", code: 30) }
        enhancer.reset()

        let t = max(0, min(seconds, source.duration - 0.05))
        let runUp = params.temporalDenoise > 0 ? min(0.3, 8 / source.fps) : 0
        let start = CMTime(seconds: max(0, t - runUp), preferredTimescale: 600)
        let end = CMTime(seconds: t + 1.5 / source.fps, preferredTimescale: 600)
        let (reader, videoOut, _) = try source.makeReader(timeRange: CMTimeRange(start: start, end: end), includeAudio: false)
        guard reader.startReading() else { throw reader.error ?? NSError(domain: "LumaFix", code: 31) }
        defer { reader.cancelReading() }

        var lastInput: CIImage?
        var lastEnhanced: CIImage?
        while let sample = videoOut.copyNextSampleBuffer() {
            guard let pb = CMSampleBufferGetImageBuffer(sample) else { continue }
            let pts = CMSampleBufferGetPresentationTimeStamp(sample).seconds
            let input = CIImage(cvPixelBuffer: pb).scaledTo(width: w, height: h)
            // Materialise the frame: the reader recycles its buffers.
            let copy = try FrameEnhancer.makeBuffer(w, h, format: kCVPixelFormatType_32BGRA)
            try enhancer.render(input, to: copy)
            let stable = CIImage(cvPixelBuffer: copy)
            lastEnhanced = try enhancer.process(stable, params: params)
            lastInput = stable
            if pts >= t { break }
        }
        guard let original = lastInput, let enhanced = lastEnhanced else {
            throw NSError(domain: "LumaFix", code: 32, userInfo: [NSLocalizedDescriptionKey: "Couldn't decode a frame here."])
        }
        let rect = CGRect(x: 0, y: 0, width: w, height: h)
        guard let a = context.createCGImage(original, from: rect, format: .RGBA8, colorSpace: srgb),
              let b = context.createCGImage(enhanced, from: rect, format: .RGBA8, colorSpace: srgb) else {
            throw NSError(domain: "LumaFix", code: 33)
        }
        return Frames(original: a, enhanced: b)
    }
}
