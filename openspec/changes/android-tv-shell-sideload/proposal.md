## Why

Android TV operators need a home-row app that opens the hosted `/tv` karaoke experience without Google Play. The monorepo already ships a thin Samsung shell (`apps/tizen`) that bakes `VKARA_TV_URL` and hands off top-level to `/tv`; Android TV needs the same pattern as a sideloadable APK. Maintainers prefer not to maintain a local Gradle/Android Studio tree, so packaging uses **Expo + react-native-tvos** with a WebView handoff, built on **EAS** (Gradle stays cloud-side). Without a shared bake/release contract, forks and official builds will drift on URL, package id, and signing.

## What Changes

- Land a thin **Android TV Expo shell** in `apps/android-tv/` — Expo SDK app using the **React Native TV fork** (`react-native-tvos`) and `@react-native-tvos/config-tv` for Leanback launcher + 320×180 banner, splash/offline/timeout UI, keep-awake, and a **WebView** that loads baked `/tv` with `launch=` cache bust (not an iframe; not an embedded Next.js bundle).
- **Delete any partial native Kotlin/Gradle scaffold** already under `apps/android-tv/` from the prior design; replace with Expo Continuous Native Generation (CNG).
- Bake handoff URL at config/build time: `VKARA_TV_URL` override else SoT `vkara.defaultTvUrl` in `app.config` / package metadata (same priority model as Tizen). Committed JS/TS source MUST NOT hardcode a production host.
- Stable Android `applicationId` / Expo `android.package` **`app.vkara.tv`** for in-place sideload upgrades.
- Official release APK: **cleartext disabled**; self-hosters who need LAN `http://` rebuild with documented `VKARA_ALLOW_CLEARTEXT=1` (config plugin / manifest network security).
- Root script `build:android-tv` (and related check/pack scripts). PR CI validates config bake + optional EAS preview build. Tag-driven release (`.github/workflows/release-android.yml` on `android-v*`) runs **EAS Build** for an **APK** (not AAB), downloads the artifact, writes SHA256, and attaches both to the GitHub Release. Tags MUST NOT reuse Docker `v*` or `tizen-v*`.
- Docs: Downloader + ADB sideload; self-host one-liner; EAS credentials / fork guidance; extend icon pipeline for Leanback banner (icon-512 lineage).
- Back behavior parity with Tizen: pre-handoff BACK exits the app; after WebView handoff, clear navigation history then BACK exits when the WebView has nowhere to go.

**Non-goals:** Google Play / AAB / Amazon Appstore; Capacitor / Cordova / TWA / re-adding PWA; embedding Next.js in the APK; Fire Store packaging; runtime multi-URL picker; committing to maintain a local Android Studio workflow; Apple TV as a product target for MVP; release-it.

## Capabilities

### New Capabilities

- `android-tv-shell-packaging`: Thin Expo + WebView shell SoT, URL/version bake, cleartext policy split, Leanback identity via config-tv, Back/history handoff contract, stable `applicationId`.
- `android-tv-apk-sideload`: EAS (or GHA→EAS) release APK build/sign, SHA256, tag-release CI, operator sideload + self-host rebuild docs.

### Modified Capabilities

<!-- none — no existing openspec/specs cover Android TV packaging; web `/tv` runtime remains a separate concern -->

## Impact

- **New/expanded:** `apps/android-tv/` (Expo app, `app.config`, `eas.json`, README), root `package.json` → `build:android-tv`, icon generator Leanback banner output, docs (`apps/android-tv/README.md`, `docs/standalone-tv-deployment.md`, root README), `.github/workflows` PR validate + `release-android.yml`, Expo/EAS project + `EXPO_TOKEN` (and EAS Android credentials).
- **Removed / superseded:** Partial Gradle-native tree under `apps/android-tv/` from the pre-pivot design (delete before Expo scaffold).
- **Related (not owned here):** hosted `/tv` D-pad/WS/YouTube behavior; Chrome76 downlevel stays on `apps/web`.
- **Unchanged:** Tizen dual-delivery, room/WebSocket protocol, Docker `v*` path, Play Store pipeline.
- **Ops:** Bump Expo app version → tag `android-vX.Y.Z` → CI triggers EAS APK build → GitHub Release with APK + SHA256; web deploys alone update karaoke UI without republishing the shell. Maintainer must create Expo project + Android credentials (or upload keystore to EAS) before first tag.
- **Trade-off (accepted):** APK includes RN/Hermes (~larger than a 1-Activity Kotlin shell) in exchange for no local Gradle maintenance.
