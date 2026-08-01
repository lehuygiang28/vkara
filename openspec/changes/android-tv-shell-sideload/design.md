## Context

vkara’s TV UX is a **hosted** Next.js route (`/tv`). Samsung already has a thin local shell (`apps/tizen`) that shows splash/offline UI, then **top-level** navigates to a baked `VKARA_TV_URL`. Android TV needs the same operator story (sideload APK, self-host URL bake) without Google Play.

Maintainers do not want to maintain Gradle/Android Studio locally. **Expo** can target Android TV via the **react-native-tvos** fork and `@react-native-tvos/config-tv`, with **EAS Build** running Gradle in the cloud. The product surface remains a **WebView handoff** to hosted `/tv` — not a native reimplementation of the karaoke UI and not an embedded Next bundle.

**Stakeholders:** maintainers shipping Android TV sideload; self-hosters/forks; end users installing via Downloader or ADB.

## Goals / Non-Goals

**Goals:**

- Thin Expo WebView shell in `apps/android-tv/` handing off to hosted `/tv`.
- Bake `VKARA_TV_URL` / `vkara.defaultTvUrl` like Tizen; official CI/EAS leaves env unset for default URL.
- Stable `applicationId` `app.vkara.tv`; Leanback launcher + 320×180 banner via config-tv.
- Sideload-only GitHub Release (APK + SHA256) on `android-v*` tags via EAS.
- Self-host one-command rebuild; cleartext only via documented `VKARA_ALLOW_CLEARTEXT=1`.
- Back/history behavior matching Tizen `location.replace` semantics.
- No requirement that maintainers run Android Studio or local `./gradlew`.

**Non-Goals:**

- Google Play / AAB / Amazon Appstore / Play App Signing as product path.
- Capacitor, Cordova, TWA, PWA reintroduction.
- Embedding Next.js offline; runtime URL picker; Fire Store packaging.
- Apple TV shipping for MVP (TV fork may allow it later; out of scope).
- Committing to a checked-in `android/` tree as the source of truth (CNG preferred).
- Certificate pinning; OEM media-key matrix as MVP gate.
- Re-implementing `/tv` chrome downlevel inside the shell (stays on `apps/web`).

## Decisions

### D1 — Pivot: Expo + react-native-tvos (not native Kotlin SoT)

| | Native Kotlin (rejected for this change) | Expo + RN-TV (chosen) |
|--|------------------------------------------|------------------------|
| Local Gradle | Required unless CI-only discipline | Hidden behind EAS / prebuild |
| Shell model | WebView Activity | RN screen + `react-native-webview` |
| Leanback | Manual manifest | `@react-native-tvos/config-tv` |
| Cost | Free GHA minutes | EAS build minutes (+ free tier) |
| APK size | Smallest | Larger (Hermes + RN) — accepted |

**Rationale:** Owner priority is avoiding local Gradle maintenance while keeping sideload APK + URL bake. Expo TV path is supported (SDK 50+ TV guide; pin `react-native-tvos` to the Expo SDK’s RN version).

**Cleanup:** Delete any partial `apps/android-tv/` Gradle/Kotlin files from the pre-pivot apply before scaffolding Expo.

### D2 — Layout & CNG (do not commit `android/`)

```
apps/android-tv/
  package.json                 # private workspace; version SoT; vkara.defaultTvUrl
  app.config.ts                # expo.android.package, plugins, extra.tvUrl bake
  eas.json                     # APK profiles
  App.tsx / src/               # splash, error, WebView handoff, Back
  assets/                      # icon, tv-banner-320x180.png
  scripts/
    check-bake.mjs
    package-release.sh         # rename APK + sha256 after EAS download
  README.md
  .gitignore                   # android/, ios/, .expo/, dist/
```

- Use **Continuous Native Generation**: run `expo prebuild` only in CI/EAS (or locally when debugging native). **Gitignore `android/` and `ios/`** — native tree is not the SoT.
- Root: `"build:android-tv"` invokes the Expo/EAS-oriented build script (not `turbo build` default graph).
- Passthrough env: `VKARA_TV_URL`, `VKARA_ALLOW_CLEARTEXT`, `EXPO_TOKEN` (CI).

**Rejected:** Committing generated `android/` as primary (merge noise, invites local Gradle ownership).

### D3 — Expo SDK / TV fork pin

- Use current stable **Expo SDK** at implement time (document exact SDK in README).
- Set dependency: `react-native` → `npm:react-native-tvos@<sdk-matching-stable>` (must match Expo’s RN major/minor per Expo TV docs).
- Add dev/plugin: `@react-native-tvos/config-tv` with `isTV: true` (or `EXPO_TV=1` for prebuild).
- Configure Leanback + banner: plugin options `androidTVBanner`, launcher icon; `android.package` = `app.vkara.tv`.
- Prefer leanback feature `required=false` so sideload remains flexible; still ship `LEANBACK_LAUNCHER` via plugin.
- App entry: single screen WebView handoff — do not depend on Expo Router for MVP unless it comes free and does not fight TV.

### D4 — Handoff: WebView top-level load (not iframe, not Next embed)

- `react-native-webview` loads baked URL with `launch=` cache-bust.
- After first successful navigation commit to `/tv`, clear WebView history / disable back-to-splash (parity with Tizen `location.replace`).
- Keep screen awake while shell is foreground (`expo-keep-awake` or equivalent).

### D5 — URL bake

| Priority | Source |
|----------|--------|
| 1 | Env `VKARA_TV_URL` (`http://` or `https://`) at config eval / EAS env |
| 2 | `vkara.defaultTvUrl` in `apps/android-tv/package.json` (or `app.config` constant SoT — one place) |

- Expose to app via `expo-constants` `extra.vkaraTvUrl` (or equivalent) generated from `app.config.ts`.
- Validate scheme; reject injection characters.
- Official CI/EAS release: **leave `VKARA_TV_URL` unset** → bake default (Tizen `release-tizen.yml` parity).
- Committed source MUST NOT hardcode production host as the bake SoT.

### D6 — Cleartext split (“hướng dẫn”)

| Artifact | Cleartext |
|----------|-----------|
| Official EAS production/release profile | **OFF** |
| Rebuild with `VKARA_ALLOW_CLEARTEXT=1` | **ON** via config plugin / `android` network security / `usesCleartextTraffic` |

Bake may accept `http://`; only the cleartext flag makes LAN HTTP loadable.

### D7 — Back (Tizen parity)

| Phase | Behavior |
|-------|----------|
| Splash / error (pre-handoff) | BACK → exit app (`BackHandler` → leave) |
| Post-handoff, WebView can go back | `webView.goBack()` |
| Post-handoff, no history | Exit app |

Never return to splash after successful handoff (history cleared / splash unmounted).

### D8 — Version, applicationId, assets

- **applicationId / android.package:** `app.vkara.tv` (frozen).
- **Version SoT:** `apps/android-tv/package.json` `"version"` (aligned with Expo `version` / `android.versionCode` policy documented in README — bump both on release).
- **Banner:** extend `apps/web/scripts/generate-pwa-icons.mjs` (or sibling) to emit 320×180; copy into `apps/android-tv/assets/` for config-tv.
- **Icon:** icon-512 lineage (same spirit as Tizen `src/icon.png`).

### D9 — EAS vs GHA+EAS

**Chosen: GitHub Actions orchestrates; EAS builds the APK.**

```
tag android-vX.Y.Z
    → GHA release-android.yml
        → eas build --platform android --profile production --non-interactive --wait
        → download APK
        → sha256 + rename vKara-tv-<ver>.apk
        → gh release create + attach APK + .sha256
```

| Profile (`eas.json`) | Use |
|----------------------|-----|
| `preview` | PR/optional: APK, may use less strict creds |
| `production` | `android-v*` release: APK, release signing, cleartext off, default URL |

- `android.buildType` / gradle command MUST produce **APK** not AAB for sideload.
- Secrets: `EXPO_TOKEN` on GitHub; Android keystore managed by **EAS credentials** (or uploaded once). Forks use their own Expo project/token.
- **Rejected as primary:** Pure GHA `./gradlew` after committed `android/` (forces Gradle ownership). Optional escape hatch: `eas build --local` on a maintainer machine is undocumented bonus only.

### D10 — Root scripts & monorepo

```json
"build:android-tv": "…",
"check:android-tv": "node apps/android-tv/scripts/check-bake.mjs"
```

- Workspace package under `apps/android-tv` (Bun/npm workspaces as repo already does for `apps/*`).
- Not part of default `turbo build` / web-api CI graph except path-filtered Android job.
- `turbo.json` / env passthrough: `VKARA_TV_URL`, `VKARA_ALLOW_CLEARTEXT`.

### D11 — CI matrix

| Step | PR / packaging CI | Tag `android-v*` | Operator |
|------|-------------------|------------------|----------|
| Resolve/bake config + `check-bake` | Yes | Yes | Local `check` |
| EAS preview APK | Optional (cost-aware) | — | — |
| EAS production APK | No | Yes | `VKARA_TV_URL=…` + EAS/local documented rebuild |
| GitHub Release + SHA256 | No | Yes | Downloader / ADB |
| Play upload | No | No | — |

### D12 — Tagging & cadence

- Annotated tag `android-vX.Y.Z` where `X.Y.Z` == `apps/android-tv` package/`expo.version`.
- Web deploy ≠ shell release.
- Plain Actions + EAS; no release-it for MVP.

### D13 — Self-host

```bash
VKARA_TV_URL=https://<your-project>.vercel.app/tv bun run build:android-tv
# LAN HTTP:
VKARA_TV_URL=http://192.168.x.x:3000/tv VKARA_ALLOW_CLEARTEXT=1 bun run build:android-tv
```

Document EAS project setup for forks (own Expo account; do not overwrite upstream credentials). Standalone TV docs gain an Android section parallel to Tizen §4.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Larger APK / slower cold start vs Kotlin shell | Accepted; document size class |
| `react-native-tvos` must track Expo SDK | Pin in README; upgrade as deliberate task |
| EAS cost / queue | Path-filter PR builds; release-only production profile |
| Expo credential lock-in for updates | Same cert via EAS; document fingerprint; forks use own package id or accept reinstall |
| Cleartext flag forgotten | `check-bake` / docs; fail or warn if `http://` without flag |
| WebView TV quirks | One-device smoke; `/tv` owns D-pad after handoff |
| Accidental commit of `android/` | `.gitignore` + CI check |

## Migration / Rollout

- Greenfield Expo app after deleting partial Gradle tree.
- First public sideload freezes `app.vkara.tv` + EAS release cert.
- Root README: Android TV sideload via Expo/EAS + `android-v*`; Play still out of scope.
- Tizen paths unchanged.

## Open Questions

1. Exact Expo SDK version at implement time (pin in README).
2. Whether PR CI always runs EAS preview (cost) or only `check-bake` by default.
3. Reference QA device for first smoke.
