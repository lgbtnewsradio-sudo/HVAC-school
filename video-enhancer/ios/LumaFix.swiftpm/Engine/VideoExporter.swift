import AVFoundation
import CoreImage
import Foundation

struct ExportProgress {
    var fraction: Double
    var framesPerSecond: Double
    var etaSeconds: Double?
    var stage: String
}

struct ExportResult {
    let url: URL
    let width: Int
    let height: Int
    let seconds: Double
    let usedAppleDenoise: Bool
    let usedAppleSuperResolution: Bool
}

/// Loads a video's upright, SDR (Rec.709) frames. Handles rotation metadata and converts
/// iPhone HDR (HLG / Dolby Vision) to SDR through an AVVideoComposition.
struct VideoSource {
    let asset: AVURLAsset
    let videoTrack: AVAssetTrack
    let audioTrack: AVAssetTrack?
    let composition: AVVideoComposition
    let size: CGSize
    let duration: Double
    let fps: Double

    static func load(_ url: URL) async throws -> VideoSource {
        let asset = AVURLAsset(url: url, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
        guard let video = try await asset.loadTracks(withMediaType: .video).first else {
            throw NSError(domain: "LumaFix", code: 10, userInfo: [NSLocalizedDescriptionKey: "That file has no video track."])
        }
        let audio = try await asset.loadTracks(withMediaType: .audio).first
        let duration = try await asset.load(.duration).seconds
        let nominal = try await video.load(.nominalFrameRate)
        let comp = try await AVMutableVideoComposition.videoComposition(withPropertiesOf: asset)
        comp.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
        comp.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
        comp.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2
        let fps = nominal > 0 ? Double(nominal) : 1 / max(comp.frameDuration.seconds, 1.0 / 240)
        return VideoSource(asset: asset, videoTrack: video, audioTrack: audio, composition: comp,
                           size: comp.renderSize, duration: duration, fps: fps)
    }

    func makeReader(timeRange: CMTimeRange? = nil, includeAudio: Bool) throws -> (AVAssetReader, AVAssetReaderVideoCompositionOutput, AVAssetReaderTrackOutput?) {
        let reader = try AVAssetReader(asset: asset)
        if let timeRange { reader.timeRange = timeRange }
        let videoOut = AVAssetReaderVideoCompositionOutput(videoTracks: [videoTrack], videoSettings: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferMetalCompatibilityKey as String: true,
        ])
        videoOut.videoComposition = composition
        videoOut.alwaysCopiesSampleData = false
        guard reader.canAdd(videoOut) else { throw NSError(domain: "LumaFix", code: 11, userInfo: [NSLocalizedDescriptionKey: "Can't read this video."]) }
        reader.add(videoOut)
        var audioOut: AVAssetReaderTrackOutput?
        if includeAudio, let audioTrack {
            let out = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: nil)
            out.alwaysCopiesSampleData = false
            if reader.canAdd(out) {
                reader.add(out)
                audioOut = out
            }
        }
        return (reader, videoOut, audioOut)
    }
}

enum VideoExporter {
    static func export(
        url: URL,
        params: EnhanceParams,
        options: ExportOptions,
        progress: @escaping @Sendable (ExportProgress) -> Void
    ) async throws -> ExportResult {
        let started = Date()
        let source = try await VideoSource.load(url)
        let srcW = Int(source.size.width.rounded())
        let srcH = Int(source.size.height.rounded())
        let out = options.outputSize(for: source.size)

        let enhancer = try FrameEnhancer(width: srcW, height: srcH)
        let context = enhancer.context

        // Optional Apple ML stages.
        var denoiser: AnyObject?
        var upscaler: AnyObject?
        if #available(iOS 26.0, macOS 26.0, *) {
            if options.useAppleDenoise && params.temporalDenoise > 0.001 {
                denoiser = AppleTemporalDenoiser(width: srcW, height: srcH, context: context)
            }
            if options.useAppleSuperResolution && out.factor > 1.01 {
                progress(ExportProgress(fraction: 0, framesPerSecond: 0, etaSeconds: nil, stage: "Preparing Apple AI upscaler…"))
                upscaler = await AppleSuperResolution(width: srcW, height: srcH, factor: out.factor, context: context)
            }
        }

        let (reader, videoOut, audioOut) = try source.makeReader(includeAudio: true)

        let outURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("LumaFix-\(UUID().uuidString.prefix(8))")
            .appendingPathExtension("mov")
        let writer = try AVAssetWriter(outputURL: outURL, fileType: .mov)
        let pixels = Double(out.width * out.height)
        let bitsPerPixel = options.useHEVC ? 0.10 : 0.16
        let bitrate = Int(min(120_000_000, max(4_000_000, pixels * source.fps * bitsPerPixel)))
        var compression: [String: Any] = [
            AVVideoAverageBitRateKey: bitrate,
            AVVideoExpectedSourceFrameRateKey: Int(source.fps.rounded()),
            AVVideoMaxKeyFrameIntervalDurationKey: 2,
        ]
        if !options.useHEVC { compression[AVVideoProfileLevelKey] = AVVideoProfileLevelH264HighAutoLevel }
        let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: options.useHEVC ? AVVideoCodecType.hevc : AVVideoCodecType.h264,
            AVVideoWidthKey: out.width,
            AVVideoHeightKey: out.height,
            AVVideoCompressionPropertiesKey: compression,
            AVVideoColorPropertiesKey: [
                AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
            ],
        ])
        videoInput.expectsMediaDataInRealTime = false
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: videoInput, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: out.width,
            kCVPixelBufferHeightKey as String: out.height,
            kCVPixelBufferMetalCompatibilityKey as String: true,
            kCVPixelBufferIOSurfacePropertiesKey as String: [String: Any](),
        ])
        guard writer.canAdd(videoInput) else { throw NSError(domain: "LumaFix", code: 12, userInfo: [NSLocalizedDescriptionKey: "Can't create the output video."]) }
        writer.add(videoInput)

        var audioInput: AVAssetWriterInput?
        if audioOut != nil, let track = source.audioTrack {
            let formats = try await track.load(.formatDescriptions)
            let input = AVAssetWriterInput(mediaType: .audio, outputSettings: nil, sourceFormatHint: formats.first)
            input.expectsMediaDataInRealTime = false
            if writer.canAdd(input) {
                writer.add(input)
                audioInput = input
            }
        }

        guard reader.startReading() else { throw reader.error ?? NSError(domain: "LumaFix", code: 13) }
        guard writer.startWriting() else { throw writer.error ?? NSError(domain: "LumaFix", code: 14) }
        writer.startSession(atSourceTime: .zero)

        // Audio is copied untouched, in parallel with video processing.
        let audioTask: Task<Void, Never>? = {
            guard let audioOut, let audioInput else { return nil }
            return Task.detached {
                while let sample = audioOut.copyNextSampleBuffer() {
                    while !audioInput.isReadyForMoreMediaData {
                        if Task.isCancelled || writer.status != .writing { return }
                        try? await Task.sleep(nanoseconds: 2_000_000)
                    }
                    audioInput.append(sample)
                }
                audioInput.markAsFinished()
            }
        }()

        let fullRect = CGRect(x: 0, y: 0, width: out.width, height: out.height)
        var framesDone = 0
        let totalFrames = max(1, source.duration * source.fps)

        func finishFrame(_ image: CIImage, pts: CMTime) async throws {
            var outImage: CIImage
            if #available(iOS 26.0, macOS 26.0, *), let sr = upscaler as? AppleSuperResolution {
                let up = CIImage(cvPixelBuffer: try await sr.upscale(image, pts: pts))
                outImage = up.scaledTo(width: out.width, height: out.height)
            } else {
                outImage = image.scaledTo(width: out.width, height: out.height)
            }
            outImage = outImage.cropped(to: fullRect)
            guard let pool = adaptor.pixelBufferPool else { throw writer.error ?? NSError(domain: "LumaFix", code: 15) }
            var pb: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pb)
            guard let buffer = pb else { throw NSError(domain: "LumaFix", code: 16, userInfo: [NSLocalizedDescriptionKey: "Out of memory."]) }
            try enhancer.render(outImage, to: buffer)
            while !videoInput.isReadyForMoreMediaData {
                if writer.status != .writing { throw writer.error ?? NSError(domain: "LumaFix", code: 17) }
                try await Task.sleep(nanoseconds: 2_000_000)
            }
            guard adaptor.append(buffer, withPresentationTime: pts) else {
                throw writer.error ?? NSError(domain: "LumaFix", code: 18, userInfo: [NSLocalizedDescriptionKey: "Writing a frame failed."])
            }
            framesDone += 1
            let elapsed = Date().timeIntervalSince(started)
            let fraction = min(1, Double(framesDone) / totalFrames)
            let fps = Double(framesDone) / max(elapsed, 0.001)
            progress(ExportProgress(fraction: fraction, framesPerSecond: fps,
                                    etaSeconds: fps > 0 ? (totalFrames - Double(framesDone)) / fps : nil,
                                    stage: "Enhancing"))
        }

        do {
            while let sample = videoOut.copyNextSampleBuffer() {
                try Task.checkCancellation()
                guard let pixelBuffer = CMSampleBufferGetImageBuffer(sample) else { continue }
                let pts = CMSampleBufferGetPresentationTimeStamp(sample)
                let input = CIImage(cvPixelBuffer: pixelBuffer)
                if #available(iOS 26.0, macOS 26.0, *), let tnf = denoiser as? AppleTemporalDenoiser {
                    for (buffer, t) in try await tnf.push(input, pts: pts, strength: params.temporalDenoise) {
                        let toned = try enhancer.process(CIImage(cvPixelBuffer: buffer), params: params, temporalDone: true)
                        try await finishFrame(toned, pts: t)
                    }
                } else {
                    let toned = try enhancer.process(input, params: params)
                    try await finishFrame(toned, pts: pts)
                }
            }
            if #available(iOS 26.0, macOS 26.0, *), let tnf = denoiser as? AppleTemporalDenoiser {
                for (buffer, t) in try await tnf.flush(strength: params.temporalDenoise) {
                    let toned = try enhancer.process(CIImage(cvPixelBuffer: buffer), params: params, temporalDone: true)
                    try await finishFrame(toned, pts: t)
                }
            }
            if reader.status == .failed { throw reader.error ?? NSError(domain: "LumaFix", code: 19) }
        } catch {
            audioTask?.cancel()
            reader.cancelReading()
            writer.cancelWriting()
            try? FileManager.default.removeItem(at: outURL)
            throw error
        }

        videoInput.markAsFinished()
        await audioTask?.value
        await writer.finishWriting()
        guard writer.status == .completed else {
            throw writer.error ?? NSError(domain: "LumaFix", code: 20, userInfo: [NSLocalizedDescriptionKey: "Finishing the video failed."])
        }
        return ExportResult(url: outURL, width: out.width, height: out.height,
                            seconds: Date().timeIntervalSince(started),
                            usedAppleDenoise: denoiser != nil, usedAppleSuperResolution: upscaler != nil)
    }
}

extension CIImage {
    /// High-quality (Lanczos) resize to an exact size, origin at zero.
    func scaledTo(width: Int, height: Int) -> CIImage {
        let ext = extent
        let sx = CGFloat(width) / ext.width
        let sy = CGFloat(height) / ext.height
        if abs(sx - 1) < 0.0001 && abs(sy - 1) < 0.0001 {
            return transformed(by: CGAffineTransform(translationX: -ext.origin.x, y: -ext.origin.y))
        }
        let base = transformed(by: CGAffineTransform(translationX: -ext.origin.x, y: -ext.origin.y))
        // Clamp first so the filter doesn't fade the borders to transparent.
        return base.clampedToExtent()
            .applyingFilter("CILanczosScaleTransform", parameters: [
                kCIInputScaleKey: sy,
                kCIInputAspectRatioKey: sx / sy,
            ])
            .cropped(to: CGRect(x: 0, y: 0, width: width, height: height))
    }
}
