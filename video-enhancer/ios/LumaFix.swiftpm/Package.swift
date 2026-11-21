// swift-tools-version: 5.9

// WARNING:
// This is a Swift Playgrounds / Xcode "App Playground" package. Open the LumaFix.swiftpm
// folder in Swift Playgrounds (iPad or Mac) or in Xcode. AppleProductTypes is provided by
// those tools; plain `swift build` on Linux will not understand it.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "LumaFix",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "LumaFix",
            targets: ["AppModule"],
            bundleIdentifier: "app.lumafix.enhancer",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .asset("AppIcon"),
            accentColor: .asset("AccentColor"),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ],
            capabilities: [
                .photoLibrary(purposeString: "LumaFix saves your enhanced videos back to your photo library.")
            ],
            appCategory: .photography
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "."
        )
    ]
)
