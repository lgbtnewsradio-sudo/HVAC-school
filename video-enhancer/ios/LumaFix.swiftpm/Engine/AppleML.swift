import CoreImage
import CoreMedia
import CoreVideo
import Foundation
import VideoToolbox

/// Apple's machine-learning video effects (VideoToolbox VTFrameProcessor, iOS/macOS 26+).
/// These run on the Neural Engine/GPU and are what Apple ships for pro video apps. LumaFix uses
/// them when available and silently falls back to its own GPU pipeline otherwise.
enum AppleML {
    static var denoiseAvailable: Bool {
        #if arch(arm64) && !targetEnvironment(simulator)
        if #available(iOS 26.0, macOS 26.0, *) { return VTTemporalNoiseFilterConfiguration.isSupported }
        #endif
        return false
    }

    static var superResolutionAvailable: Bool {
        #if arch(arm64) && !targetEnvironment(simulator)
        if #available(iOS 26.0, macOS 26.0, *) { return VTSuperResolutionScalerConfiguration.isSupported }
        #endif
        return false
    }
}

private func makePool(_ attributes: [String: any Sendable]) -> CVPixelBufferPool? {
    var pool: CVPixelBufferPool?
    CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, attributes as CFDictionary, &pool)
    return pool
}

private func poolBuffer(_ pool: CVPixelBufferPool) throws -> CVPixelBuffer {
    var pb: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pb)
    guard status == kCVReturnSuccess, let buffer = pb else {
        throw NSError(domain: "LumaFix", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Out of frame buffers."])
    }
    return buffer
}

// The ML frame processors exist only on real Apple-silicon devices and Macs (the simulator SDKs
// don't ship them), so they are compiled only there; other builds get inert stand-ins.
#if arch(arm64) && !targetEnvironment(simulator)

@available(iOS 26.0, macOS 26.0, *)
private func run(_ processor: VTFrameProcessor, _ parameters: any VTFrameProcessorParameters) async throws {
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
        processor.process(parameters: parameters) { _, error in
            if let error { cont.resume(throwing: error) } else { cont.resume() }
        }
    }
}

/// Machine-learning temporal noise filter. Needs a few future frames, so frames come out
/// delayed: `push` returns whatever became ready, `flush` drains the rest at the end.
@available(iOS 26.0, macOS 26.0, *)
final class AppleTemporalDenoiser {
    private let processor = VTFrameProcessor()
    private let configuration: VTTemporalNoiseFilterConfiguration
    private let sourcePool: CVPixelBufferPool
    private let destinationPool: CVPixelBufferPool
    private let context: CIContext
    private let pastCount: Int
    private let futureCount: Int
    private var frames: [VTFrameProcessorFrame] = []
    private var nextToEmit = 0 // index into `frames`
    private var emittedAny = false

    init?(width: Int, height: Int, context: CIContext) {
        guard VTTemporalNoiseFilterConfiguration.isSupported else { return nil }
        if let maxDim = VTTemporalNoiseFilterConfiguration.maximumDimensions,
           width > Int(maxDim.width) || height > Int(maxDim.height) { return nil }
        if let minDim = VTTemporalNoiseFilterConfiguration.minimumDimensions,
           width < Int(minDim.width) || height < Int(minDim.height) { return nil }
        let formats = VTTemporalNoiseFilterConfiguration.supportedSourcePixelFormats
        let preferred: [OSType] = [kCVPixelFormatType_32BGRA, kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange, kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
        guard let format = preferred.first(where: { formats.contains($0) }) ?? formats.first,
              let cfg = VTTemporalNoiseFilterConfiguration(frameWidth: width, frameHeight: height, sourcePixelFormat: format),
              let src = makePool(cfg.sourcePixelBufferAttributes),
              let dst = makePool(cfg.destinationPixelBufferAttributes) else { return nil }
        do {
            try processor.startSession(configuration: cfg)
        } catch {
            return nil
        }
        configuration = cfg
        sourcePool = src
        destinationPool = dst
        self.context = context
        pastCount = max(0, cfg.previousFrameCount ?? 2)
        futureCount = max(0, cfg.nextFrameCount ?? 2)
    }

    deinit { processor.endSession() }

    /// Add a source frame; returns denoised frames (in order) that are now complete.
    func push(_ image: CIImage, pts: CMTime, strength: Float) async throws -> [(CVPixelBuffer, CMTime)] {
        let buffer = try poolBuffer(sourcePool)
        let dest = CIRenderDestination(pixelBuffer: buffer)
        dest.colorSpace = nil
        _ = try context.startTask(toRender: image, to: dest).waitUntilCompleted()
        guard let frame = VTFrameProcessorFrame(buffer: buffer, presentationTimeStamp: pts) else {
            throw NSError(domain: "LumaFix", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid frame for Apple denoiser."])
        }
        frames.append(frame)
        var out: [(CVPixelBuffer, CMTime)] = []
        while nextToEmit + futureCount < frames.count {
            out.append(try await emit(strength: strength))
        }
        return out
    }

    func flush(strength: Float) async throws -> [(CVPixelBuffer, CMTime)] {
        var out: [(CVPixelBuffer, CMTime)] = []
        while nextToEmit < frames.count {
            out.append(try await emit(strength: strength))
        }
        return out
    }

    private func emit(strength: Float) async throws -> (CVPixelBuffer, CMTime) {
        let i = nextToEmit
        let source = frames[i]
        let past = Array(frames[max(0, i - pastCount)..<i])
        let future = Array(frames[(i + 1)..<min(frames.count, i + 1 + futureCount)])
        let outBuffer = try poolBuffer(destinationPool)
        guard let destination = VTFrameProcessorFrame(buffer: outBuffer, presentationTimeStamp: source.presentationTimeStamp),
              let parameters = VTTemporalNoiseFilterParameters(
                sourceFrame: source, nextFrames: future, previousFrames: past, destinationFrame: destination,
                filterStrength: max(0, min(1, strength)), hasDiscontinuity: !emittedAny) else {
            throw NSError(domain: "LumaFix", code: 4, userInfo: [NSLocalizedDescriptionKey: "Apple denoiser rejected the frame."])
        }
        try await run(processor, parameters)
        emittedAny = true
        nextToEmit += 1
        // Drop frames no longer needed as past references.
        let drop = max(0, nextToEmit - pastCount)
        if drop > 0 {
            frames.removeFirst(drop)
            nextToEmit -= drop
        }
        return (outBuffer, source.presentationTimeStamp)
    }
}

/// Machine-learning super resolution (video mode, uses the previous frame for stability).
@available(iOS 26.0, macOS 26.0, *)
final class AppleSuperResolution {
    let scaleFactor: Int
    private let processor = VTFrameProcessor()
    private let sourcePool: CVPixelBufferPool
    private let destinationPool: CVPixelBufferPool
    private let context: CIContext
    private var previousSource: VTFrameProcessorFrame?
    private var previousOutput: VTFrameProcessorFrame?

    /// - Parameter factor: desired upscale (e.g. 1.5 or 2); the smallest supported factor ≥ it is used.
    init?(width: Int, height: Int, factor: Double, context: CIContext) async {
        guard VTSuperResolutionScalerConfiguration.isSupported, factor > 1.01 else { return nil }
        let supported = VTSuperResolutionScalerConfiguration.supportedScaleFactors.sorted()
        guard let scale = supported.first(where: { Double($0) >= factor - 0.01 }) ?? supported.last,
              let cfg = VTSuperResolutionScalerConfiguration(
                frameWidth: width, frameHeight: height, scaleFactor: scale, inputType: .video,
                usePrecomputedFlow: false, qualityPrioritization: .normal,
                revision: VTSuperResolutionScalerConfiguration.defaultRevision) else { return nil }
        if cfg.configurationModelStatus != .ready {
            do {
                try await cfg.downloadConfigurationModel()
            } catch {
                return nil
            }
        }
        guard let src = makePool(cfg.sourcePixelBufferAttributes),
              let dst = makePool(cfg.destinationPixelBufferAttributes) else { return nil }
        do {
            try processor.startSession(configuration: cfg)
        } catch {
            return nil
        }
        scaleFactor = scale
        sourcePool = src
        destinationPool = dst
        self.context = context
    }

    deinit { processor.endSession() }

    func upscale(_ image: CIImage, pts: CMTime) async throws -> CVPixelBuffer {
        let buffer = try poolBuffer(sourcePool)
        let dest = CIRenderDestination(pixelBuffer: buffer)
        dest.colorSpace = nil
        _ = try context.startTask(toRender: image, to: dest).waitUntilCompleted()
        let outBuffer = try poolBuffer(destinationPool)
        guard let source = VTFrameProcessorFrame(buffer: buffer, presentationTimeStamp: pts),
              let destination = VTFrameProcessorFrame(buffer: outBuffer, presentationTimeStamp: pts),
              let parameters = VTSuperResolutionScalerParameters(
                sourceFrame: source, previousFrame: previousSource, previousOutputFrame: previousOutput,
                opticalFlow: nil, submissionMode: .sequential, destinationFrame: destination) else {
            throw NSError(domain: "LumaFix", code: 5, userInfo: [NSLocalizedDescriptionKey: "Apple super resolution rejected the frame."])
        }
        try await run(processor, parameters)
        previousSource = source
        previousOutput = destination
        return outBuffer
    }
}

#else

@available(iOS 26.0, macOS 26.0, *)
final class AppleTemporalDenoiser {
    init?(width: Int, height: Int, context: CIContext) { return nil }
    func push(_ image: CIImage, pts: CMTime, strength: Float) async throws -> [(CVPixelBuffer, CMTime)] { [] }
    func flush(strength: Float) async throws -> [(CVPixelBuffer, CMTime)] { [] }
}

@available(iOS 26.0, macOS 26.0, *)
final class AppleSuperResolution {
    init?(width: Int, height: Int, factor: Double, context: CIContext) async { return nil }
    func upscale(_ image: CIImage, pts: CMTime) async throws -> CVPixelBuffer {
        throw NSError(domain: "LumaFix", code: 6, userInfo: [NSLocalizedDescriptionKey: "Apple super resolution needs a real Apple-silicon device."])
    }
}

#endif
