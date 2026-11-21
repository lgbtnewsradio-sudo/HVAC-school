// End-to-end check of the native engine on macOS (run by CI):
//   1. synthesise a dark, noisy, panning test clip,
//   2. verify camera-motion tracking measures the known pan,
//   3. run the full export and check it got brighter and less noisy.
import AVFoundation
import CoreImage
import Foundation

@main
struct EngineTest {
    static let w = 640, h = 360, frames = 45
    static let panX = 2, panY = 1 // texture moves this many px per frame (top-down rows)

    static func fail(_ msg: String) -> Never {
        print("FAIL: \(msg)")
        exit(1)
    }

    static func texture() -> [Float] {
        // Smooth random "scene" larger than the frame so we can pan across it.
        let tw = w + panX * frames + 8, th = h + panY * frames + 8
        var rng = SystemRandomNumberGenerator()
        let gw = tw / 16 + 2, gh = th / 16 + 2
        let grid = (0..<(gw * gh * 3)).map { _ in Float.random(in: 0...1, using: &rng) }
        var tex = [Float](repeating: 0, count: tw * th * 3)
        for y in 0..<th {
            for x in 0..<tw {
                let gx = Float(x) / 16, gy = Float(y) / 16
                let x0 = Int(gx), y0 = Int(gy)
                let fx = gx - Float(x0), fy = gy - Float(y0)
                for c in 0..<3 {
                    func g(_ i: Int, _ j: Int) -> Float { grid[((j * gw) + i) * 3 + c] }
                    let v = (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy
                    // add crisp edges so there is detail to track
                    let edge: Float = ((x / 24 + y / 24) % 2 == 0) ? 0.25 : 0
                    tex[(y * tw + x) * 3 + c] = v * 0.75 + edge
                }
            }
        }
        return tex
    }

    static func makeClip(_ url: URL) throws {
        let tw = w + panX * frames + 8
        let tex = texture()
        let writer = try AVAssetWriter(outputURL: url, fileType: .mov)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 12_000_000],
        ])
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: w, kCVPixelBufferHeightKey as String: h,
        ])
        writer.add(input)
        writer.startWriting()
        writer.startSession(atSourceTime: .zero)
        var rng = SystemRandomNumberGenerator()
        for f in 0..<frames {
            while !input.isReadyForMoreMediaData { usleep(1000) }
            var pb: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
            guard let buffer = pb else { fail("pixel buffer") }
            CVPixelBufferLockBaseAddress(buffer, [])
            let base = CVPixelBufferGetBaseAddress(buffer)!.assumingMemoryBound(to: UInt8.self)
            let stride = CVPixelBufferGetBytesPerRow(buffer)
            let ox = f * panX, oy = f * panY
            for y in 0..<h {
                for x in 0..<w {
                    let t = ((y + oy) * tw + (x + ox)) * 3
                    var rgb = [Float](repeating: 0, count: 3)
                    for c in 0..<3 {
                        // ~4 stops underexposed + shot/read noise, then sRGB-ish gamma
                        let lin = tex[t + c] * 0.05
                        let noisy = max(0, lin + Float.random(in: -1...1, using: &rng) * 0.012 * (0.4 + sqrt(lin) * 2))
                        rgb[c] = pow(noisy, 1 / 2.2)
                    }
                    let p = base + y * stride + x * 4
                    p[0] = UInt8(min(255, rgb[2] * 255)); p[1] = UInt8(min(255, rgb[1] * 255))
                    p[2] = UInt8(min(255, rgb[0] * 255)); p[3] = 255
                }
            }
            CVPixelBufferUnlockBaseAddress(buffer, [])
            adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: 30))
        }
        input.markAsFinished()
        let sem = DispatchSemaphore(value: 0)
        writer.finishWriting { sem.signal() }
        sem.wait()
        guard writer.status == .completed else { fail("writing test clip: \(String(describing: writer.error))") }
    }

    /// Mean luma and a noise estimate (mean |pixel - 4-neighbour average|) over all frames.
    static func measure(_ url: URL) async throws -> (frames: Int, size: CGSize, mean: Double, noise: Double) {
        let source = try await VideoSource.load(url)
        let (reader, out, _) = try source.makeReader(includeAudio: false)
        reader.startReading()
        var n = 0
        var sum = 0.0, noise = 0.0
        while let s = out.copyNextSampleBuffer() {
            guard let pb = CMSampleBufferGetImageBuffer(s) else { continue }
            CVPixelBufferLockBaseAddress(pb, .readOnly)
            let base = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
            let stride = CVPixelBufferGetBytesPerRow(pb)
            let pw = CVPixelBufferGetWidth(pb), ph = CVPixelBufferGetHeight(pb)
            func l(_ x: Int, _ y: Int) -> Double {
                let p = base + y * stride + x * 4
                return (0.114 * Double(p[0]) + 0.587 * Double(p[1]) + 0.299 * Double(p[2])) / 255
            }
            var fs = 0.0, fn = 0.0, c = 0.0
            var y = 2
            while y < ph - 2 {
                var x = 2
                while x < pw - 2 {
                    let v = l(x, y)
                    fs += v
                    fn += abs(v - (l(x - 1, y) + l(x + 1, y) + l(x, y - 1) + l(x, y + 1)) / 4)
                    c += 1
                    x += 3
                }
                y += 3
            }
            CVPixelBufferUnlockBaseAddress(pb, .readOnly)
            sum += fs / c
            noise += fn / c
            n += 1
        }
        return (n, source.size, sum / Double(max(n, 1)), noise / Double(max(n, 1)))
    }

    static func main() async {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("lumafix-test-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let clip = dir.appendingPathComponent("dark.mov")
        do {
            try makeClip(clip)
            print("Apple ML denoise available: \(AppleML.denoiseAvailable), super resolution: \(AppleML.superResolutionAvailable)")

            // Motion tracking check.
            let source = try await VideoSource.load(clip)
            let (reader, out, _) = try source.makeReader(includeAudio: false)
            reader.startReading()
            let enhancer = try FrameEnhancer(width: w, height: h)
            var shifts: [MotionShift] = []
            while let s = out.copyNextSampleBuffer(), shifts.count < 12 {
                guard let pb = CMSampleBufferGetImageBuffer(s) else { continue }
                let img = try enhancer.process(CIImage(cvPixelBuffer: pb), params: .default)
                let tmp = try FrameEnhancer.makeBuffer(w, h, format: kCVPixelFormatType_32BGRA)
                try enhancer.render(img, to: tmp)
                shifts.append(enhancer.lastShift)
            }
            reader.cancelReading()
            print("Measured shifts (CI coords):", shifts.map { String(format: "(%.2f, %.2f%@)", $0.dx, $0.dy, $0.lost ? " lost" : "") }.joined(separator: " "))
            let tracked = shifts.dropFirst(2)
            let mdx = tracked.map(\.dx).reduce(0, +) / Double(tracked.count)
            let mdy = tracked.map(\.dy).reduce(0, +) / Double(tracked.count)
            // Texture moves +2 px right / +1 row down per frame => expect (2, -1) in y-up coordinates.
            guard abs(mdx - Double(panX)) < 0.5, abs(mdy + Double(panY)) < 0.5 else {
                fail(String(format: "motion tracking off: mean (%.2f, %.2f), expected (%d, %d)", mdx, mdy, panX, -panY))
            }
            print(String(format: "Motion tracking OK: mean (%.2f, %.2f)", mdx, mdy))

            // Full export.
            var options = ExportOptions()
            options.scale = .x2
            options.useHEVC = false
            let result = try await VideoExporter.export(url: clip, params: .default, options: options) { _ in }
            let before = try await measure(clip)
            let after = try await measure(result.url)
            print(String(format: "Before: %d frames %@ mean %.3f noise %.4f", before.frames, "\(before.size)", before.mean, before.noise))
            print(String(format: "After:  %d frames %@ mean %.3f noise %.4f (took %.1fs)", after.frames, "\(after.size)", after.mean, after.noise, result.seconds))
            guard after.frames == before.frames else { fail("frame count changed \(before.frames) -> \(after.frames)") }
            guard Int(after.size.width) == w * 2, Int(after.size.height) == h * 2 else { fail("wrong output size \(after.size)") }
            guard after.mean > before.mean * 1.4 else { fail("not brighter") }
            // Noise relative to brightness must drop clearly.
            let relBefore = before.noise / before.mean, relAfter = after.noise / after.mean
            print(String(format: "Relative noise: %.4f -> %.4f", relBefore, relAfter))
            guard relAfter < relBefore * 0.75 else { fail("noise not reduced enough") }
            print("PASS")
        } catch {
            fail("\(error)")
        }
    }
}
