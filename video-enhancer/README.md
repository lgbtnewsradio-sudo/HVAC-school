# LumaFix — night-video enhancer

Fixes dark, grainy phone videos on your own device. It removes grain, lifts shadows, corrects
color casts and sharpens, and can optionally upscale (up to 4K). Videos never leave the device.

There are two versions that use the same enhancement method:

| | **Web app** (`web/`) | **iPhone / iPad app** (`ios/LumaFix.swiftpm`) |
|---|---|---|
| Install | Open a link in Safari, then *Add to Home Screen* | Swift Playgrounds on the iPad (free), or Xcode on a Mac |
| Developer account | Not needed | Not needed |
| Pick from Photos | ✅ (Safari may convert HEVC to H.264 on import) | ✅ original quality |
| Save to Photos | Share sheet → **Save Video** | One tap, **Save to Photos** |
| Apple AI denoise and upscaling | — | ✅ on iOS 26 (Apple's VideoToolbox ML models) |
| Gemini AI auto-tune | ✅ (optional, your own free key) | — |
| Long 4K videos | OK up to a few minutes (memory) | Best choice |

## What it does (both versions)

1. **Grain removal that follows the camera.** The app measures how the camera moved between frames,
   lines the previous frame up with the current one, and averages them. On handheld night video
   this removes grain far better than a single-frame filter such as the Photos “auto-enhance” wand.
   Moving people and objects are detected and kept sharp, with no ghost trails.
2. **Edge-aware cleanup within each frame.** Color speckles are removed aggressively and the
   brightness detail gently. The cleanup is stronger in spots where step 1 couldn't help.
3. **Brightening like a photographer would.** The app sets a target exposure for the whole frame,
   then lifts the dark areas more than the bright ones. The lift respects edges, so there are no
   halos. Highlights roll off softly instead of clipping.
4. **Auto white balance** removes orange and green casts from indoor and streetlight scenes.
5. **Contrast-adaptive sharpening and high-quality upscaling.** On iOS 26 the app can use Apple's
   neural super resolution for the upscaling.

Presets: Balanced, Very dark, Warm indoor, Keep the mood, Fast motion. Drag on the preview to
compare before and after.

---

## Install the iPad / iPhone app with no developer account

### Option A: Swift Playgrounds on the iPad (no Mac needed)

1. Install **Swift Playgrounds** (free, by Apple) from the App Store on your iPad.
2. Get the `LumaFix.swiftpm` folder onto the iPad:
   - On GitHub, download this repository as a ZIP (Code → Download ZIP), or AirDrop the folder
     from your Mac.
   - In the Files app, unzip it and open `video-enhancer/ios/LumaFix.swiftpm`. It opens in Swift
     Playgrounds.
3. Tap **▶ Run**. The app launches full-screen on your iPad. You can keep it in the Playgrounds
   library and run it any time; it does not expire.
4. On iPadOS 26 the **Apple AI denoise / upscaling** toggles turn on automatically.

### Option B: Xcode on your Mac → install on iPhone or iPad (free Apple ID)

1. Install **Xcode** from the Mac App Store. Xcode 26 needs macOS Sequoia 15.6 or later.
   - Note: a 2019 13-inch MacBook Pro can run Sequoia. Xcode is slow on it, but it only *builds*
     the app; the video processing runs on the iPhone or iPad.
2. Open `video-enhancer/ios/LumaFix.swiftpm` in Xcode (double-click it).
3. Xcode → Settings → Accounts → add your normal Apple ID (free “Personal Team”).
4. Select the **LumaFix** target → *Signing & Capabilities* → Team = your Personal Team. If Xcode
   complains, change the bundle identifier to something unique, e.g. `com.yourname.lumafix`.
5. Plug in the iPhone or iPad, pick it as the run destination and press **▶ Run**.
6. On the device: Settings → General → VPN & Device Management → trust your Apple ID. On iOS 16+,
   also turn on Settings → Privacy & Security → **Developer Mode**.

With a free account, apps installed this way stop opening after **7 days**; just press Run again.
A paid developer account ($99/yr) extends that to a year and allows TestFlight/App Store.

### Option C: Use the web app

Open the web app in Safari → Share → **Add to Home Screen**. It works on iPhone, iPad and Mac
with nothing to install.

**Publishing it (one-time):** in this GitHub repo go to *Settings → Pages → Source* and choose
**GitHub Actions**. After that, every change merged to `main` publishes the app to
`https://lgbtnewsradio-sudo.github.io/HVAC-school/`. That's done by the workflow
`.github/workflows/lumafix-web.yml`.
Alternatively, on vercel.com choose *Add New → Project*, import this repo, and set the
*Root Directory* to `video-enhancer/web` (Vercel detects Vite automatically).

---

## Web app development

```bash
cd video-enhancer/web
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (deploy anywhere that serves HTTPS)
```

WebCodecs needs a secure context (HTTPS or localhost). Deploy `dist/` to any static host
(Vercel, Netlify, Cloudflare Pages, GitHub Pages).

### Gemini auto-tune (optional)

Your Gemini subscription is a consumer plan. The app needs a separate **free API key**:
<https://aistudio.google.com/apikey> → *Create API key*. Paste it in the web app under
*Gemini settings*. When you tap **AI auto-tune**, the app sends a single downscaled still frame
(never the video) to Gemini, which picks settings for that scene. The key is stored only in
that browser.

Gemini and Veo can't faithfully restore an existing video: they *generate* new footage. That's why
the actual enhancement runs on your device.

## Native app layout

```
ios/LumaFix.swiftpm/
  Package.swift          App Playground manifest (Swift Playgrounds + Xcode)
  App/                   SwiftUI screens, Photos import/export
  Engine/                Platform-neutral engine (Core Image + Metal kernels + VideoToolbox ML)
ios/EngineTests/main.swift   End-to-end engine test, run on macOS by CI
```

CI (`.github/workflows/lumafix-ios.yml`) type-checks the app against the iOS SDK. It also runs the
engine test on a Mac runner: synthetic dark clip → checks motion tracking → full export → brighter
and less noisy.
