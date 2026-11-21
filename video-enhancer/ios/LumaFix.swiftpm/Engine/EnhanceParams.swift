import CoreGraphics
import Foundation

/// User-facing enhancement controls. Mirrors the web app so presets behave the same everywhere.
struct EnhanceParams: Codable, Equatable {
    var brightness: Float = 0.55
    var shadows: Float = 0.6
    var temporalDenoise: Float = 0.7
    var spatialDenoise: Float = 0.5
    var colorFix: Float = 0.5
    var saturation: Float = 1.1
    var sharpen: Float = 0.4
    var blackPoint: Float = 0.3
    var contrast: Float = 0.35

    static let `default` = EnhanceParams()

    struct Spec: Identifiable {
        let id: WritableKeyPath<EnhanceParams, Float>
        let label: String
        let range: ClosedRange<Float>
        let help: String
    }

    static let specs: [Spec] = [
        Spec(id: \.brightness, label: "Brightness", range: 0...1, help: "Overall exposure target"),
        Spec(id: \.shadows, label: "Shadow lift", range: 0...1, help: "Brighten dark areas more than bright ones"),
        Spec(id: \.temporalDenoise, label: "Grain removal", range: 0...1, help: "Averages noise away across frames"),
        Spec(id: \.spatialDenoise, label: "Color noise", range: 0...1, help: "Cleans blotchy color speckles"),
        Spec(id: \.colorFix, label: "Color fix", range: 0...1, help: "Auto white balance"),
        Spec(id: \.saturation, label: "Saturation", range: 0...2, help: "Color intensity"),
        Spec(id: \.sharpen, label: "Sharpen", range: 0...1, help: "Restore fine detail"),
        Spec(id: \.blackPoint, label: "Black depth", range: 0...1, help: "Deepen washed-out blacks"),
        Spec(id: \.contrast, label: "Contrast", range: 0...1, help: "Midtone punch"),
    ]

    struct Preset: Identifiable {
        var id: String { name }
        let name: String
        let params: EnhanceParams
    }

    static let presets: [Preset] = {
        var veryDark = EnhanceParams()
        veryDark.brightness = 0.7; veryDark.shadows = 0.75; veryDark.temporalDenoise = 0.85
        veryDark.spatialDenoise = 0.7; veryDark.blackPoint = 0.45; veryDark.sharpen = 0.3
        veryDark.saturation = 1.15; veryDark.contrast = 0.4
        var warm = EnhanceParams()
        warm.colorFix = 0.85; warm.saturation = 1.05
        var mood = EnhanceParams()
        mood.brightness = 0.42; mood.shadows = 0.45; mood.colorFix = 0.15; mood.saturation = 1.05; mood.contrast = 0.45
        var motion = EnhanceParams()
        motion.temporalDenoise = 0.35; motion.spatialDenoise = 0.65; motion.sharpen = 0.3
        return [
            Preset(name: "Balanced", params: EnhanceParams()),
            Preset(name: "Very dark", params: veryDark),
            Preset(name: "Warm indoor", params: warm),
            Preset(name: "Keep the mood", params: mood),
            Preset(name: "Fast motion", params: motion),
        ]
    }()
}

/// Output options for an export.
struct ExportOptions {
    enum Scale: String, CaseIterable, Identifiable {
        case auto, original, x1_5, x2
        var id: String { rawValue }
        var label: String {
            switch self {
            case .auto: return "Auto"
            case .original: return "Original"
            case .x1_5: return "1.5×"
            case .x2: return "2×"
            }
        }
    }

    var scale: Scale = .auto
    /// Use Apple's machine-learning temporal noise filter when the OS supports it (iOS 26+).
    var useAppleDenoise = true
    /// Use Apple's machine-learning super resolution for upscaling when supported (iOS 26+).
    var useAppleSuperResolution = true
    /// HEVC is smaller and native to Photos; H.264 is the most compatible.
    var useHEVC = true

    static let maxLongSide = 3840

    func outputSize(for size: CGSize) -> (width: Int, height: Int, factor: Double) {
        let long = Double(max(size.width, size.height))
        var factor: Double
        switch scale {
        case .auto: factor = long <= 1000 ? 2 : (long <= 1400 ? 1.5 : 1)
        case .original: factor = 1
        case .x1_5: factor = 1.5
        case .x2: factor = 2
        }
        factor = min(factor, Double(Self.maxLongSide) / long)
        func even(_ v: Double) -> Int { max(2, Int((v / 2).rounded()) * 2) }
        return (even(Double(size.width) * factor), even(Double(size.height) * factor), factor)
    }
}
