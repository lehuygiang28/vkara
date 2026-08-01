## 0. Cleanup pre-pivot Gradle

- [x] 0.1 Remove partial native Kotlin/Gradle tree under `apps/android-tv/` (wrapper, `app/`, manifests, etc.) left from the pre-Expo design
- [x] 0.2 Ensure `apps/android-tv/.gitignore` will ignore generated `android/`, `ios/`, `.expo/`, `dist/`

## 1. Scaffold Expo TV shell

- [x] 1.1 Create Expo app in `apps/android-tv/` (workspace package) on a current stable Expo SDK
- [x] 1.2 Replace `react-native` with SDK-matched `react-native-tvos`; add `@react-native-tvos/config-tv` with `isTV` / `EXPO_TV` and `android.package` `app.vkara.tv`
- [x] 1.3 Add WebView handoff screen: splash, offline/timeout error + retry, keep-awake, `launch=` cache-bust load of baked URL
- [x] 1.4 Implement Back contract: exit on splash/error; clear WebView history after handoff; goBack vs exit post-handoff
- [x] 1.5 Wire root scripts `build:android-tv` / `check:android-tv` (env passthrough `VKARA_TV_URL`, `VKARA_ALLOW_CLEARTEXT`); exclude from default `turbo build`
- [x] 1.6 Add `apps/android-tv/README.md` (SDK pin, TV fork, CNG, bake, EAS, sideload, tags)

## 2. URL bake & cleartext split

- [x] 2.1 Add SoT `vkara.defaultTvUrl` + `app.config.ts` bake into `extra` / Constants; reject invalid schemes; no production host in committed app source
- [x] 2.2 Official/default: cleartext disabled; implement `VKARA_ALLOW_CLEARTEXT=1` path (config plugin or documented prebuild mod)
- [x] 2.3 Add `scripts/check-bake.mjs` asserting URL resolution, `app.vkara.tv`, cleartext default off when env unset
- [x] 2.4 Document self-host one-liners (HTTPS + LAN HTTP)

## 3. Leanback assets

- [x] 3.1 Extend `apps/web/scripts/generate-pwa-icons.mjs` (or sibling) to emit 320×180 Leanback banner from icon-512 lineage
- [x] 3.2 Point config-tv `androidTVBanner` (+ icon) at `apps/android-tv/assets/…`
- [x] 3.3 Verify prebuild/EAS manifest has `LEANBACK_LAUNCHER` + banner; leanback feature not unduly blocking sideload (`required=false` unless product later requires TV-only)

## 4. EAS project & profiles

- [x] 4.1 Create Expo project linked to `apps/android-tv`; document `eas init` / projectId in config
- [x] 4.2 Add `eas.json` with `preview` and `production` profiles that emit **APK** (not AAB)
- [x] 4.3 Configure EAS Android credentials / keystore for `app.vkara.tv`; document fork = own Expo project
- [x] 4.4 Add `scripts/package-release.sh` (or GHA steps) to rename downloaded artifact to `vKara-tv-<ver>.apk` + write `.sha256`

## 5. CI & GitHub Release

- [x] 5.1 PR/`main` path-filtered job: install deps, `check-bake`, optionally EAS `preview` (cost-aware); never create `android-v*` Release
- [x] 5.2 Add `.github/workflows/release-android.yml` on `push.tags: ['android-v*']` with `contents: write`
- [x] 5.3 Release job: `EXPO_TOKEN`; leave `VKARA_TV_URL` unset; `eas build --platform android --profile production --non-interactive --wait`; download APK; `check-bake`; gate tag semver == app version; `gh release create` with APK + SHA256; notes include baked URL + `applicationId`
- [x] 5.4 Document maintainer flow: bump `apps/android-tv` version in PR → merge → `git tag -a android-vX.Y.Z` (not Docker `v*` / `tizen-v*`)

## 6. Docs & rollout

- [x] 6.1 Document Downloader + ADB sideload; unknown-sources; signature/`-r` upgrade constraints
- [x] 6.2 Extend `docs/standalone-tv-deployment.md` (and VI counterpart if present) with Android Expo/EAS self-host + `VKARA_ALLOW_CLEARTEXT=1`
- [x] 6.3 Root README: Android TV sideload via Expo/EAS + `android-v*`; no local Gradle required; Play/Fire Store out of scope
- [ ] 6.4 Smoke on one Android TV / Google TV device: install, home-row banner, handoff to `/tv`, room QR, BACK exits with empty WebView history
