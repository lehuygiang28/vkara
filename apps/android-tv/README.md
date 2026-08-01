# @vkara/android-tv — Android TV shell (Expo + react-native-tvos)

Thin Expo TV app that hands off to the hosted `/tv` karaoke experience via WebView.

| | |
|--|--|
| SDK | Expo **56** |
| RN | `react-native-tvos@0.85.3-3` (pin exact; Bun cannot resolve `0.85-stable`) |
| Package id | `app.vkara.tv` (frozen) |
| Branding | `assets/icon.png` + `assets/tv-banner.png` (synced from web `icon-512`) |
| Native SoT | CNG — **do not commit** `android/` / `ios/` |
| Release | EAS APK on tags `android-v*` |

Android Studio / local Gradle are **not** required for the happy path. See [Build Expo apps for TV](https://docs.expo.dev/guides/building-for-tv/).

## Configurable TV URL

| Priority | Source |
|----------|--------|
| 1 | `VKARA_TV_URL` env (`http://` or `https://`) |
| 2 | `package.json` → `vkara.defaultTvUrl` |

```sh
# official / default bake
bun run check:bake

# self-host
VKARA_TV_URL=https://your-host.example.com/tv bun run check:bake

# LAN HTTP (not used by official CI)
VKARA_TV_URL=http://192.168.1.10:3000/tv VKARA_ALLOW_CLEARTEXT=1 bun run check:bake
```

Committed `App.tsx` must not hardcode a production host — bake lands in `expo.extra.vkaraTvUrl`.

## Scripts

```sh
bun run sync:assets          # icon + Leanback 320×180 banner
bun run check:bake           # URL / package id / cleartext contracts
bun run prebuild:tv          # EXPO_TV=1 expo prebuild --clean (local debug only)
bun run build:eas production # EAS APK (needs EXPO_TOKEN + eas project)
bun run package:release path/to.apk
```

Root:

```sh
bun run check:android-tv
bun run build:android-tv     # sync:assets + EAS production
```

## EAS setup (maintainers)

1. `cd apps/android-tv && bunx eas-cli login && bunx eas init`
2. Paste `projectId` into `app.config.js` → `extra.eas.projectId` (or set `EAS_PROJECT_ID`).
3. Configure Android credentials for `app.vkara.tv` (`eas credentials`).
4. Add GitHub secret `EXPO_TOKEN`.
5. Forks: use **your** Expo project — do not reuse upstream credentials.

`eas.json` profiles `preview` / `production` both emit **APK** (`buildType: apk`) with `EXPO_TV=1`.

## Sideload

1. Download `vKara-tv-<ver>.apk` (+ `.sha256`) from a GitHub Release `android-v*`.
2. On the TV: Downloader / file manager → allow install unknown apps → install.
3. Or: `adb connect <tv-ip>` → `adb install -r vKara-tv-<ver>.apk`.

Upgrades require the **same** `applicationId` + signing cert. Debug/preview vs production signatures will not upgrade in place.

## Maintainer release

1. Bump `apps/android-tv/package.json` `"version"` in a PR (and `vkara.defaultTvUrl` if needed).
2. Merge, then: `git tag -a android-vX.Y.Z -m "android tv shell X.Y.Z" && git push origin android-vX.Y.Z`
3. `release-android.yml` runs EAS with **default** URL (`VKARA_TV_URL` unset), attaches APK + SHA256.

Do **not** use Docker `v*` or `tizen-v*` tags. Web deploys ≠ shell release.

## Layout

```
package.json          version + vkara.defaultTvUrl + TV fork pin
app.config.js         bake URL, android.package, config-tv, cleartext plugin
App.tsx               splash / WebView handoff / Back
eas.json              APK profiles (EXPO_TV=1)
plugins/withCleartext.js
scripts/              check-bake, sync-assets, build-eas, package-release
assets/               icon.png, tv-banner.png (generated/synced)
```
