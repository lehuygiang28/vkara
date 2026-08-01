## ADDED Requirements

### Requirement: Thin Expo WebView shell is the packaging source of truth
The monorepo SHALL provide a thin Android TV shell under `apps/android-tv/` implemented as an Expo application using the React Native TV fork (`react-native-tvos`) and a WebView that loads the hosted `/tv` experience. The shell MUST show splash and offline/timeout error UI, MUST attempt to keep the screen on while visible, and MUST load the baked `/tv` URL with a per-launch `launch` cache-bust query parameter. The shell MUST NOT embed the Next.js application bundle and MUST NOT use a cross-origin iframe for handoff. Any pre-pivot native Kotlin/Gradle scaffold under `apps/android-tv/` MUST be removed in favor of this Expo shell.

#### Scenario: Successful handoff when online
- **WHEN** the shell launches and the device has network connectivity
- **THEN** the WebView loads the baked `/tv` URL including a unique `launch` query value after showing splash

#### Scenario: Offline or stalled handoff surfaces retry UI
- **WHEN** the device is offline or the handoff does not commit within the configured timeout
- **THEN** the shell shows an error UI that allows retry and BACK to exit without completing handoff

### Requirement: Build config bakes URL and version without hardcoding the host
The Android TV config/build SHALL resolve the handoff URL as `VKARA_TV_URL` when set, otherwise `vkara.defaultTvUrl` from the `apps/android-tv` SoT (`package.json` or equivalent single documented field consumed by `app.config`). Committed application source MUST NOT hardcode a production host as the bake SoT. Override values MUST start with `http://` or `https://` or config/build MUST fail. The shell version SoT SHALL be the Expo app version in `apps/android-tv`, used for `android-v*` release tagging.

#### Scenario: Default URL when env unset
- **WHEN** `VKARA_TV_URL` is unset during config evaluation for an official build
- **THEN** the app bakes `vkara.defaultTvUrl` and committed source still does not treat a production host literal as the bake SoT

#### Scenario: Custom URL bake
- **WHEN** `VKARA_TV_URL` is set to a valid `https://…/tv` URL during build/config
- **THEN** the built app hands off to that URL

#### Scenario: Invalid URL rejected
- **WHEN** `VKARA_TV_URL` does not start with `http://` or `https://`
- **THEN** config or build fails with a non-zero exit code

### Requirement: Stable applicationId and Leanback home-row identity via config-tv
The Android `applicationId` / Expo `android.package` SHALL be `app.vkara.tv` and MUST remain stable across versions. The project MUST use `@react-native-tvos/config-tv` (or equivalent documented TV prebuild configuration) so the native project declares a Leanback launcher and a TV banner resource at 320×180. The app MUST be installable as a landscape Android TV home-row app without Google Play publication. Generated native projects SHOULD follow Continuous Native Generation with `android/` gitignored rather than treating committed Gradle trees as source of truth.

#### Scenario: Package id unchanged across shell versions
- **WHEN** a new shell version is built for release
- **THEN** the APK still declares application id `app.vkara.tv`

#### Scenario: Leanback launcher present after prebuild
- **WHEN** TV prebuild/EAS generates the Android project with config-tv enabled
- **THEN** the Android manifest includes a Leanback launcher entry and references a 320×180 banner

### Requirement: Cleartext policy split for official vs self-host rebuilds
Official release builds with cleartext disabled SHALL NOT load cleartext HTTP targets under the default network security policy. Builds produced with `VKARA_ALLOW_CLEARTEXT=1` SHALL allow cleartext HTTP so self-hosters can point at LAN `http://` URLs. Documentation SHALL describe the cleartext rebuild path; the default CI/EAS release path MUST leave cleartext disabled.

#### Scenario: Official release rejects cleartext
- **WHEN** an official release APK (cleartext off) is configured with an `http://` handoff URL
- **THEN** the WebView does not successfully load that cleartext target under the default network security policy

#### Scenario: Cleartext rebuild allows LAN HTTP
- **WHEN** an operator builds with `VKARA_ALLOW_CLEARTEXT=1` and a valid `http://` `VKARA_TV_URL`
- **THEN** the resulting APK is permitted to load that cleartext URL

### Requirement: Back behavior matches Tizen handoff semantics
Before handoff completes, BACK MUST exit the application. After a successful handoff, the WebView history MUST be cleared (or otherwise prevented from returning to splash). After handoff, BACK MUST navigate WebView history when available and MUST exit the application when WebView history is empty.

#### Scenario: BACK on splash exits
- **WHEN** the user presses BACK while splash or error UI is showing before handoff
- **THEN** the application exits

#### Scenario: BACK after handoff with empty history exits
- **WHEN** handoff has completed, history was cleared, and the user presses BACK with no WebView history
- **THEN** the application exits
