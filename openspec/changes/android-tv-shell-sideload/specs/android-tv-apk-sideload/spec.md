## ADDED Requirements

### Requirement: EAS-produced APK is the sideload artifact
The packaging pipeline SHALL produce a release-signed Android APK (not AAB as the primary artifact) suitable for Android TV sideload (Downloader or ADB), built via **EAS Build** (invoked from GitHub Actions on release tags, and optionally for PR preview). GitHub Release assets for shell tags MUST include that APK and a SHA256 checksum file. The pipeline MUST NOT require Google Play publication for MVP.

#### Scenario: Tag release attaches APK and checksum
- **WHEN** an annotated tag `android-vX.Y.Z` triggers release CI and gates pass
- **THEN** a GitHub Release for that tag includes `vKara-tv-X.Y.Z.apk` (or equivalent name) and a matching SHA256 file

#### Scenario: Release profile builds APK not AAB
- **WHEN** the EAS `production` profile runs for an official shell release
- **THEN** the build output used for GitHub Release is an `.apk` file

### Requirement: Tag-driven release CI bakes default URL and uses EAS credentials
On `push` tags matching `android-v*`, CI SHALL invoke EAS with `VKARA_TV_URL` unset (baking `vkara.defaultTvUrl`), authenticate with `EXPO_TOKEN` (or equivalent non-interactive Expo auth), wait for the production APK, verify bake contracts, and gate that tag semver matches the `apps/android-tv` Expo app version. PR/packaging CI SHALL validate bake/config contracts and MUST NOT create an `android-v*` GitHub Release as the happy path for every PR.

#### Scenario: Official release uses default URL
- **WHEN** release CI runs for `android-v*` with `VKARA_TV_URL` unset
- **THEN** the baked handoff URL equals `vkara.defaultTvUrl` and bake checks pass

#### Scenario: Semver gate
- **WHEN** tag `android-vX.Y.Z` does not match `apps/android-tv` version `X.Y.Z`
- **THEN** release CI fails and does not publish Release assets

#### Scenario: PR CI does not create production Release
- **WHEN** a pull request triggers Android TV packaging CI
- **THEN** CI validates bake/config (and may optionally run a non-release EAS profile) and does not create an `android-v*` GitHub Release

### Requirement: Operator docs cover sideload, EAS, and self-host rebuild
Repository documentation SHALL describe Android TV install via Downloader and via `adb install`, the stable `applicationId` `app.vkara.tv`, Expo/EAS prerequisites for maintainers and forks (`EXPO_TOKEN`, EAS Android credentials), and self-host rebuild with `VKARA_TV_URL=… bun run build:android-tv` plus optional `VKARA_ALLOW_CLEARTEXT=1` for LAN HTTP. Docs SHALL state that web deploys do not require a new `android-v*` tag, that tags MUST NOT collide with Docker `v*` or `tizen-v*`, and that maintainers are not required to run Android Studio or local Gradle for the happy path.

#### Scenario: Self-host rebuild documented
- **WHEN** an operator follows standalone/Android TV docs to point at their own frontend
- **THEN** the docs instruct setting `VKARA_TV_URL` and rebuilding via `build:android-tv` without a second packaging repository

#### Scenario: Sideload paths documented
- **WHEN** an end user installs the official Release APK
- **THEN** docs describe both Downloader-style install and ADB `adb install -r`
