## ADDED Requirements

### Requirement: TizenBrew app module packed from staged shell
The monorepo SHALL provide a TizenBrew adapter that packages the shared staged shell as a public npm module with `packageType` equal to `app`, a user-facing `appName`, an `appPath` pointing at the staged launcher HTML, and a `keys` array covering the media keys the shell registers. The published tarball MUST be built from an allowlisted staged file set and MUST NOT require `config.xml` for TizenBrew install.

#### Scenario: npm pack produces app module
- **WHEN** an operator runs the TizenBrew pack script (directly or via `build:tizen` / `build:tizen:tizenbrew`) after a successful stage
- **THEN** the output package declares `packageType: "app"`, includes staged HTML/JS/CSS/icon files, and is installable by TizenBrew via jsDelivr as an application module

#### Scenario: Media keys declared for TizenBrew parent registration
- **WHEN** the TizenBrew package manifest is generated
- **THEN** `keys` includes at least MediaPlayPause, MediaPlay, MediaPause, MediaStop, MediaTrackNext, MediaTrackPrevious, MediaRewind, and MediaFastForward

### Requirement: Module version matches shell version
The TizenBrew adapter SHALL set the published package `version` to the same shell semver used for WGT `config.xml` in that build.

#### Scenario: Aligned semver across adapters
- **WHEN** shell version is `1.2.3` and both adapters run from the same stage
- **THEN** the TizenBrew package version is `1.2.3` and the WGT widget version is `1.2.3`

### Requirement: Publish cadence independent of web deploys
Shell/module releases SHALL be triggered by shell or packaging-manifest changes, not by every hosted `/tv` web deploy. Documentation MUST state that web deploys update the karaoke UI without republishing the TizenBrew module.

#### Scenario: Docs separate web deploy from module publish
- **WHEN** an operator reads TizenBrew install/release docs
- **THEN** the docs state that npm publish is only required when the shell wrapper, keys, default URL, or related packaging assets change

### Requirement: CI publishes TizenBrew module only on shell release tags
The repository SHALL publish `@vkara/tv` from GitHub Actions when an annotated tag matching `tizen-v<semver>` is pushed. Tag `<semver>` MUST equal `apps/tizen/package.json` `"version"` and the generated `dist/tizenbrew/package.json` `"version"` for that build. Publish MUST NOT run on pull_request, `main`/`dev` pushes, web deploys, or Docker `v*` tags.

#### Scenario: Tag triggers publish
- **WHEN** tag `tizen-v1.2.3` is pushed and `apps/tizen/package.json` version is `1.2.3`
- **THEN** CI builds the TizenBrew package and publishes `@vkara/tv@1.2.3` to the npm registry

#### Scenario: Version mismatch fails closed
- **WHEN** tag `tizen-v1.2.3` is pushed but `apps/tizen/package.json` version is not `1.2.3`
- **THEN** the release job fails and MUST NOT publish to npm

#### Scenario: PR does not publish
- **WHEN** a pull request builds Tizen packaging artifacts
- **THEN** CI MAY pack and upload artifacts but MUST NOT run `npm publish`

### Requirement: npm publish uses OIDC trusted publishing and provenance
CI SHALL authenticate to npm using Trusted Publishing (OIDC) with `id-token: write` on a GitHub-hosted runner. Publish MUST run via the npm CLI from the generated directory `apps/tizen/dist/tizenbrew` (not the private workspace root `apps/tizen`). The publish command MUST request public access and provenance (explicitly via `--provenance` and/or Trusted Publishing’s automatic provenance). Long-lived `NPM_TOKEN` MUST NOT be required for the steady-state release path.

#### Scenario: Provenance-attested public publish
- **WHEN** the release workflow publishes successfully
- **THEN** `@vkara/tv` is public on npm and the published version has a provenance attestation tied to the GitHub Actions workflow run

#### Scenario: Private workspace package is not published
- **WHEN** the release workflow publishes
- **THEN** it publishes only the generated `@vkara/tv` package from `dist/tizenbrew` and does not publish private `@vkara/tizen`

### Requirement: Shell GitHub Release includes WGT artifact
For each successful `tizen-v<semver>` release, CI SHALL create a GitHub Release for that tag and attach the unsigned `vKara.wgt` built from the same stage as the published npm module. CI MAY also attach the packed `.tgz`.

#### Scenario: Sideload asset on the same release
- **WHEN** shell release `tizen-v1.2.3` completes successfully
- **THEN** the GitHub Release for `tizen-v1.2.3` includes `vKara.wgt` produced in that workflow run

### Requirement: TizenBrew install documentation
Repository documentation SHALL describe installing TizenBrew, adding the published module name in Module Manager, launching the vKara tile, falling back to WGT sideload (including GitHub Release assets) if jsDelivr/module install fails, and the maintainer tag-release flow (`tizen-v*`).

#### Scenario: Install path documented
- **WHEN** an operator follows TizenBrew docs for `@vkara/tv`
- **THEN** the docs give the module package name `@vkara/tv` to add and the expectation that launch opens the shell then hands off to hosted `/tv`

#### Scenario: Release tag convention documented
- **WHEN** a maintainer follows shell release docs
- **THEN** the docs instruct bumping `apps/tizen/package.json` version, pushing annotated tag `tizen-vX.Y.Z`, and not reusing Docker `v*` tags
