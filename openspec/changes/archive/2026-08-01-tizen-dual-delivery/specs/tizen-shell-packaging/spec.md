## ADDED Requirements

### Requirement: Shared Tizen shell is the packaging source of truth
The monorepo SHALL provide a single thin Tizen shell source tree used by all Samsung TV packaging adapters. The shell MUST show splash and offline/timeout error UI with a user-agent badge, MUST register media keys and attempt screensaver-off before handoff, and MUST navigate top-level via `location.replace` to the baked hosted `/tv` URL with a per-launch `launch` cache-bust query parameter. The shell MUST NOT embed the Next.js application bundle.

#### Scenario: Successful handoff when online
- **WHEN** the shell launches and the device reports online connectivity
- **THEN** the shell registers media keys, attempts to disable the screensaver, and replaces the location with the baked `/tv` URL including a unique `launch` query value

#### Scenario: Offline launch surfaces retry UI
- **WHEN** the shell launches and the device reports offline
- **THEN** the shell shows an error overlay that allows OK to retry and BACK to exit without navigating to `/tv`

#### Scenario: Handoff timeout surfaces retry UI
- **WHEN** navigation to the baked `/tv` URL does not commit within the configured handoff timeout
- **THEN** the shell shows an error overlay that allows OK to retry

### Requirement: Shared stage bakes URL and version
The packaging pipeline SHALL expose a shared stage step that copies the shell source into a stage directory, resolves the TV handoff URL, bakes it into staged shell JavaScript via a single placeholder replacement, and stamps a single semver from `apps/tizen/package.json` into packaging manifests that need a version. Committed shell source MUST use placeholder `__VKARA_TV_URL__` and MUST NOT hardcode a production host. The fallback URL SoT SHALL be `apps/tizen/package.json` → `vkara.defaultTvUrl`. Override SHALL be `VKARA_TV_URL` (`http://` or `https://`). Both WGT and TizenBrew adapters MUST consume that staged tree rather than re-baking independently.

#### Scenario: Default URL when env unset
- **WHEN** `VKARA_TV_URL` is unset during stage
- **THEN** the staged shell bakes `vkara.defaultTvUrl` from `apps/tizen/package.json` and the source tree still contains `__VKARA_TV_URL__`

#### Scenario: Custom URL baked for both adapters
- **WHEN** `VKARA_TV_URL` is set to a valid `https://` host path during stage
- **THEN** the staged `main.js` contains that URL (placeholder removed) and both subsequent adapters package that staged file unchanged for URL content

#### Scenario: Invalid URL rejected
- **WHEN** `VKARA_TV_URL` is set to a value that does not start with `http://` or `https://`
- **THEN** the stage step fails with a non-zero exit code and produces no packaging artifacts

### Requirement: Shell stays Tizen 6.0-safe and package id stays stable
Shell JavaScript and CSS SHALL remain syntactically compatible with Tizen 6.0 (~Chrome 76) without relying on the web app’s post-build downlevel pass. The WGT `config.xml` package id SHALL be `VkaraApp01` and the application id SHALL be `VkaraApp01.vkara`. That package id MUST remain stable across releases so reinstalls upgrade in place.

#### Scenario: Package id unchanged across shell versions
- **WHEN** a new shell version is staged for WGT packaging
- **THEN** `config.xml` still declares package id `VkaraApp01`, application id `VkaraApp01.vkara`, and `required_version` of at least `6.0`

### Requirement: Pull request CI validates packaging without publishing
On pull requests that change Tizen packaging inputs (or as part of packaging CI), the pipeline SHALL stage the shell, build the WGT adapter, and pack the TizenBrew adapter (or equivalent dry-run) without publishing to npm.

#### Scenario: PR packaging dry-run
- **WHEN** a pull request triggers packaging CI for `apps/tizen`
- **THEN** CI produces or validates WGT and TizenBrew pack outputs and does not publish npm packages
