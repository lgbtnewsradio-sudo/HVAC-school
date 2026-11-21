import AVKit
import PhotosUI
import SwiftUI

struct ContentView: View {
    @StateObject private var model = AppModel()
    @State private var pickerItem: PhotosPickerItem?
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        NavigationStack {
            Group {
                switch model.phase {
                case .empty:
                    EmptyStateView(pickerItem: $pickerItem)
                case .loading where model.original == nil:
                    ProgressView("Loading video…").frame(maxWidth: .infinity, maxHeight: .infinity)
                default:
                    editor
                }
            }
            .navigationTitle("LumaFix")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    PhotosPicker(selection: $pickerItem, matching: .videos, preferredItemEncoding: .current) {
                        Label("Choose video", systemImage: "photo.on.rectangle")
                    }
                }
            }
            .background(Color.black.opacity(0.96).ignoresSafeArea())
        }
        .preferredColorScheme(.dark)
        .onChange(of: pickerItem) { _, item in
            if let item { model.load(item) }
        }
        .sheet(isPresented: Binding(get: { model.phase == .exporting }, set: { _ in })) {
            ExportProgressView(model: model)
                .interactiveDismissDisabled()
                .presentationDetents([.medium])
        }
        .sheet(isPresented: Binding(get: { model.phase == .done }, set: { if !$0 { model.closeResult() } })) {
            ResultView(model: model)
        }
        .alert("Something went wrong", isPresented: Binding(get: { model.errorMessage != nil }, set: { if !$0 { model.errorMessage = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.errorMessage ?? "")
        }
    }

    @ViewBuilder private var editor: some View {
        if sizeClass == .regular {
            HStack(alignment: .top, spacing: 20) {
                VStack(spacing: 12) {
                    PreviewPane(model: model)
                    TimeScrubber(model: model)
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity)
                ScrollView { ControlsPanel(model: model) }
                    .frame(width: 360)
            }
            .padding()
        } else {
            ScrollView {
                VStack(spacing: 14) {
                    PreviewPane(model: model)
                    TimeScrubber(model: model)
                    ControlsPanel(model: model)
                }
                .padding()
            }
        }
    }
}

struct EmptyStateView: View {
    @Binding var pickerItem: PhotosPickerItem?

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "moon.stars.fill")
                .font(.system(size: 64))
                .foregroundStyle(.orange.gradient)
            Text("Make dark videos look like they were shot in good light")
                .font(.title2.bold())
                .multilineTextAlignment(.center)
            Text("Removes grain across frames, lifts shadows, fixes color casts and sharpens. It can also upscale with Apple's AI. Everything runs on this device.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            PhotosPicker(selection: $pickerItem, matching: .videos, preferredItemEncoding: .current) {
                Text("Choose from Photos")
                    .font(.headline)
                    .padding(.horizontal, 28)
                    .padding(.vertical, 14)
                    .background(Capsule().fill(Color.orange))
                    .foregroundStyle(.black)
            }
            Spacer()
        }
        .padding(28)
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
    }
}

/// Before/after comparison: drag anywhere on the picture to move the divider.
struct PreviewPane: View {
    @ObservedObject var model: AppModel

    var body: some View {
        ZStack {
            if let original = model.original, let enhanced = model.enhanced {
                GeometryReader { geo in
                    let w = geo.size.width
                    ZStack(alignment: .leading) {
                        Image(decorative: enhanced, scale: 1).resizable().scaledToFit()
                        Image(decorative: original, scale: 1).resizable().scaledToFit()
                            .mask(alignment: .leading) {
                                Rectangle().frame(width: max(0, w * model.split))
                            }
                        Rectangle().fill(.white).frame(width: 2).offset(x: w * model.split - 1)
                    }
                    .contentShape(Rectangle())
                    .gesture(DragGesture(minimumDistance: 0).onChanged { v in
                        model.split = min(1, max(0, v.location.x / max(w, 1)))
                    })
                }
                .aspectRatio(CGFloat(original.width) / CGFloat(max(original.height, 1)), contentMode: .fit)
                .overlay(alignment: .topLeading) { Tag(text: "Before") }
                .overlay(alignment: .topTrailing) { Tag(text: "After", color: .orange) }
            } else {
                Rectangle().fill(.black).aspectRatio(16 / 9, contentMode: .fit)
            }
            if model.previewBusy {
                ProgressView().tint(.white)
                    .padding(8)
                    .background(.ultraThinMaterial, in: Circle())
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(10)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

struct Tag: View {
    let text: String
    var color: Color = .white
    var body: some View {
        Text(text).font(.caption.bold()).foregroundStyle(color)
            .padding(.horizontal, 9).padding(.vertical, 4)
            .background(.black.opacity(0.55), in: Capsule())
            .padding(10)
    }
}

struct TimeScrubber: View {
    @ObservedObject var model: AppModel
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(AppModel.formatTime(model.previewTime)).monospacedDigit()
                Slider(value: $model.previewTime, in: 0...max(model.duration, 0.1))
                Text(AppModel.formatTime(model.duration)).monospacedDigit()
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            Text(model.info).font(.caption2).foregroundStyle(.secondary)
        }
    }
}

struct ControlsPanel: View {
    @ObservedObject var model: AppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(EnhanceParams.presets) { preset in
                        let active = preset.params == model.params
                        Button(preset.name) { model.params = preset.params }
                            .buttonStyle(.bordered)
                            .tint(active ? .orange : .gray)
                    }
                }
            }

            GroupBox("Adjust") {
                VStack(spacing: 10) {
                    ForEach(EnhanceParams.specs) { spec in
                        VStack(spacing: 2) {
                            HStack {
                                Text(spec.label)
                                Spacer()
                                Text(spec.id == \EnhanceParams.saturation
                                     ? "\(Int((model.params[keyPath: spec.id] * 100).rounded()))%"
                                     : "\(Int((model.params[keyPath: spec.id] * 100).rounded()))")
                                    .foregroundStyle(.secondary).monospacedDigit()
                            }
                            .font(.subheadline)
                            Slider(value: Binding(
                                get: { model.params[keyPath: spec.id] },
                                set: { model.params[keyPath: spec.id] = $0 }
                            ), in: spec.range)
                        }
                    }
                    Button("Reset to defaults") { model.params = .default }
                        .font(.footnote)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            GroupBox("Output") {
                VStack(alignment: .leading, spacing: 10) {
                    Picker("Size", selection: $model.options.scale) {
                        ForEach(ExportOptions.Scale.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Text(model.outputDescription).font(.caption).foregroundStyle(.secondary)
                    Toggle("HEVC (smaller files)", isOn: $model.options.useHEVC)
                    Toggle(isOn: $model.options.useAppleDenoise) {
                        VStack(alignment: .leading) {
                            Text("Apple AI denoise")
                            Text(AppleML.denoiseAvailable ? "Neural-network grain removal" : "Needs iOS 26 on a supported device")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .disabled(!AppleML.denoiseAvailable)
                    Toggle(isOn: $model.options.useAppleSuperResolution) {
                        VStack(alignment: .leading) {
                            Text("Apple AI upscaling")
                            Text(AppleML.superResolutionAvailable ? "Neural-network super resolution" : "Needs iOS 26 on a supported device")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .disabled(!AppleML.superResolutionAvailable)
                }
            }

            Button {
                model.startExport()
            } label: {
                Text("Enhance full video").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .foregroundStyle(.black)
        }
    }
}

struct ExportProgressView: View {
    @ObservedObject var model: AppModel
    var body: some View {
        VStack(spacing: 16) {
            Text("Enhancing…").font(.title3.bold())
            ProgressView(value: model.progress.fraction).tint(.orange)
            Text(statusText).font(.footnote).foregroundStyle(.secondary).monospacedDigit()
            Text("Keep LumaFix open until it finishes.").font(.footnote).foregroundStyle(.secondary)
            Button("Cancel", role: .cancel) { model.cancelExport() }
        }
        .padding(24)
    }

    private var statusText: String {
        let p = model.progress
        var s = "\(Int(p.fraction * 100))% · \(String(format: "%.1f", p.framesPerSecond)) frames/s"
        if let eta = p.etaSeconds { s += " · about \(AppModel.formatTime(eta)) left" }
        if p.stage != "Enhancing" && !p.stage.isEmpty { s = p.stage }
        return s
    }
}

struct ResultView: View {
    @ObservedObject var model: AppModel
    @State private var player: AVPlayer?

    var body: some View {
        NavigationStack {
            VStack(spacing: 14) {
                if let player {
                    VideoPlayer(player: player)
                        .aspectRatio(CGFloat(model.result?.width ?? 16) / CGFloat(max(model.result?.height ?? 9, 1)), contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                if let r = model.result {
                    Text(details(r)).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    Button {
                        Task { await model.saveToPhotos() }
                    } label: {
                        Label(model.savedToPhotos ? "Saved to Photos" : "Save to Photos",
                              systemImage: model.savedToPhotos ? "checkmark.circle.fill" : "square.and.arrow.down")
                            .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .buttonStyle(.borderedProminent).tint(.orange).foregroundStyle(.black)
                    .disabled(model.savedToPhotos)
                    ShareLink(item: r.url) {
                        Label("Share…", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                Spacer(minLength: 0)
            }
            .padding()
            .navigationTitle("Done ✨")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Back") { model.closeResult() } }
            }
            .onAppear {
                if let url = model.result?.url {
                    let p = AVPlayer(url: url)
                    p.isMuted = true
                    player = p
                    p.play()
                }
            }
            .onDisappear { player?.pause() }
        }
        .preferredColorScheme(.dark)
    }

    private func details(_ r: ExportResult) -> String {
        var parts = ["\(r.width)×\(r.height)", "took \(AppModel.formatTime(r.seconds))"]
        if r.usedAppleDenoise { parts.append("Apple AI denoise") }
        if r.usedAppleSuperResolution { parts.append("Apple AI upscaling") }
        return parts.joined(separator: " · ")
    }
}
