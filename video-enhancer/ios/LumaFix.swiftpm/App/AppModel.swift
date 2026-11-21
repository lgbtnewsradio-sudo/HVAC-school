import AVFoundation
import CoreImage
import Photos
import PhotosUI
import SwiftUI
import UIKit

/// A video picked from Photos, copied into the app's temporary folder.
struct PickedMovie: Transferable {
    let url: URL

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(contentType: .movie) { movie in
            SentTransferredFile(movie.url)
        } importing: { received in
            let ext = received.file.pathExtension.isEmpty ? "mov" : received.file.pathExtension
            let dest = FileManager.default.temporaryDirectory
                .appendingPathComponent("source-\(UUID().uuidString)")
                .appendingPathExtension(ext)
            try FileManager.default.copyItem(at: received.file, to: dest)
            return PickedMovie(url: dest)
        }
    }
}

@MainActor
final class AppModel: ObservableObject {
    enum Phase: Equatable {
        case empty
        case loading
        case editing
        case exporting
        case done
    }

    @Published var phase: Phase = .empty
    @Published var params: EnhanceParams = AppModel.loadParams() {
        didSet { saveParams(); schedulePreview() }
    }
    @Published var options = ExportOptions()
    @Published var previewTime: Double = 0 {
        didSet { schedulePreview(delay: 0.08) }
    }
    @Published var split: CGFloat = 0.5
    @Published private(set) var original: CGImage?
    @Published private(set) var enhanced: CGImage?
    @Published private(set) var previewBusy = false
    @Published private(set) var duration: Double = 0
    @Published private(set) var info = ""
    @Published private(set) var progress = ExportProgress(fraction: 0, framesPerSecond: 0, etaSeconds: nil, stage: "")
    @Published private(set) var result: ExportResult?
    @Published var errorMessage: String?
    @Published var savedToPhotos = false

    private var sourceURL: URL?
    private var renderer: PreviewRenderer?
    private var previewTask: Task<Void, Never>?
    private var exportTask: Task<Void, Never>?
    private let previewQueue = DispatchQueue(label: "lumafix.preview", qos: .userInitiated)

    var outputDescription: String {
        guard let renderer else { return "" }
        let o = options.outputSize(for: renderer.source.size)
        let up = o.factor > 1.01 ? String(format: " (%.1f× upscale)", o.factor).replacingOccurrences(of: ".0×", with: "×") : ""
        return "Output: \(o.width)×\(o.height)\(up)"
    }

    // MARK: Loading

    func load(_ item: PhotosPickerItem) {
        phase = .loading
        Task {
            do {
                guard let movie = try await item.loadTransferable(type: PickedMovie.self) else {
                    throw NSError(domain: "LumaFix", code: 40, userInfo: [NSLocalizedDescriptionKey: "Couldn't load that video."])
                }
                try await open(movie.url)
            } catch {
                errorMessage = error.localizedDescription
                phase = renderer == nil ? .empty : .editing
            }
        }
    }

    func open(_ url: URL) async throws {
        let source = try await VideoSource.load(url)
        if let old = sourceURL, old != url { try? FileManager.default.removeItem(at: old) }
        sourceURL = url
        renderer = PreviewRenderer(source: source)
        duration = source.duration
        let size = try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber
        let mb = Double(size?.int64Value ?? 0) / 1_000_000
        info = String(format: "%d×%d · %.0f fps · %@ · %.1f MB",
                      Int(source.size.width), Int(source.size.height), source.fps, Self.formatTime(source.duration), mb)
        original = nil
        enhanced = nil
        phase = .editing
        previewTime = min(source.duration * 0.25, 2)
        schedulePreview(delay: 0)
    }

    // MARK: Preview

    func schedulePreview(delay: Double = 0.15) {
        guard let renderer, phase == .editing || phase == .loading else { return }
        previewTask?.cancel()
        let params = self.params
        let time = self.previewTime
        previewTask = Task { [weak self] in
            if delay > 0 { try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000)) }
            guard !Task.isCancelled, let self else { return }
            self.previewBusy = true
            let frames: PreviewRenderer.Frames? = await withCheckedContinuation { cont in
                self.previewQueue.async {
                    cont.resume(returning: try? renderer.render(at: time, params: params))
                }
            }
            guard !Task.isCancelled else { return }
            if let frames {
                self.original = frames.original
                self.enhanced = frames.enhanced
            }
            self.previewBusy = false
        }
    }

    // MARK: Export

    func startExport() {
        guard let url = sourceURL else { return }
        phase = .exporting
        savedToPhotos = false
        progress = ExportProgress(fraction: 0, framesPerSecond: 0, etaSeconds: nil, stage: "Starting…")
        UIApplication.shared.isIdleTimerDisabled = true
        let params = self.params
        let options = self.options
        exportTask = Task { [weak self] in
            do {
                let result = try await VideoExporter.export(url: url, params: params, options: options) { p in
                    Task { @MainActor in self?.progress = p }
                }
                guard let self else { return }
                if let old = self.result?.url { try? FileManager.default.removeItem(at: old) }
                self.result = result
                self.phase = .done
            } catch is CancellationError {
                self?.phase = .editing
            } catch {
                self?.errorMessage = "Export failed: \(error.localizedDescription)"
                self?.phase = .editing
            }
            UIApplication.shared.isIdleTimerDisabled = false
        }
    }

    func cancelExport() {
        exportTask?.cancel()
    }

    func closeResult() {
        phase = .editing
    }

    func saveToPhotos() async {
        guard let url = result?.url else { return }
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        guard status == .authorized || status == .limited else {
            errorMessage = "LumaFix needs permission to add to Photos. You can also use Share → Save Video."
            return
        }
        do {
            try await PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
            }
            savedToPhotos = true
        } catch {
            errorMessage = "Couldn't save: \(error.localizedDescription)"
        }
    }

    // MARK: Persistence

    private static let paramsKey = "lumafix.params"

    private static func loadParams() -> EnhanceParams {
        guard let data = UserDefaults.standard.data(forKey: paramsKey),
              let p = try? JSONDecoder().decode(EnhanceParams.self, from: data) else { return .default }
        return p
    }

    private func saveParams() {
        if let data = try? JSONEncoder().encode(params) { UserDefaults.standard.set(data, forKey: Self.paramsKey) }
    }

    static func formatTime(_ s: Double) -> String {
        guard s.isFinite, s >= 0 else { return "–" }
        let total = Int(s.rounded(.down))
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}
