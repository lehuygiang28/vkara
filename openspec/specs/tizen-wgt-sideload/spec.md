# tizen-wgt-sideload Specification

## Purpose
Unsigned WGT packaging adapter and operator docs for Apps2Samsung sideload of the shared Tizen shell.
## Requirements
### Requirement: Unsigned WGT build from staged shell
The monorepo SHALL provide a WGT adapter that packages the shared staged shell (including `config.xml`) into an unsigned `dist/vKara.wgt` zip suitable for Apps2Samsung sideload. The default build path MUST NOT require Samsung certificates or the Tizen Studio `tizen package` sign step.

#### Scenario: Root script produces unsigned WGT
- **WHEN** an operator runs the WGT packaging script (directly or via `build:tizen` / `build:tizen:wgt`) with `zip` available
- **THEN** the build writes `apps/tizen/dist/vKara.wgt` containing staged `config.xml` at the archive root and exits successfully without invoking certificate signing

#### Scenario: Missing zip tool fails clearly
- **WHEN** the WGT build runs and `zip` is not on `PATH`
- **THEN** the build exits non-zero with an error mentioning that `zip` is required

### Requirement: WGT version matches shell version
The WGT adapter SHALL ensure the staged `config.xml` widget version equals the shell semver from `apps/tizen/package.json` for that build.

#### Scenario: Version stamped into config.xml
- **WHEN** `apps/tizen/package.json` version is `1.2.3` and the WGT adapter runs after stage
- **THEN** the packaged `config.xml` declares widget version `1.2.3`

### Requirement: Sideload documentation for operators
Repository documentation SHALL describe Developer Mode setup, Apps2Samsung custom `.wgt` install, the optional Tizen Studio sign+install path, and that self-hosters rebuild with `VKARA_TV_URL` before sideloading.

#### Scenario: Self-host rebuild documented
- **WHEN** an operator follows the standalone/TV packaging docs to point at their own frontend
- **THEN** the docs instruct setting `VKARA_TV_URL` and rebuilding the WGT from the monorepo without maintaining a second packaging tree
