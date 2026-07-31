# @vkara/tizen — Samsung TV shell (Tizen 6.5+, 2022+ models)

Thin Tizen web-app shell that hands off top-level to the hosted `/tv`
experience (not an iframe — cross-origin iframes inside a Tizen widget hit
third-party storage restrictions).

Shared source of truth for two adapters:

| Adapter | Output | Install |
|---------|--------|---------|
| **WGT** | `dist/vKara.wgt` (unsigned) | [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) |
| **TizenBrew** | `dist/tizenbrew/` + `.tgz` → npm `@vkara/tv` | TizenBrew Module Manager |

Android TV is **out of scope**.

## Configurable TV URL

Committed `src/js/main.js` uses placeholder `__VKARA_TV_URL__` — **no host in source**.

| Priority | Source |
|----------|--------|
| 1 | `VKARA_TV_URL` env (must be `http://` or `https://`) |
| 2 (fallback) | `package.json` → `vkara.defaultTvUrl` |

```sh
# official / default bake (uses vkara.defaultTvUrl)
bun run build:tizen

# self-host / fork
VKARA_TV_URL=https://your-host.example.com/tv bun run build:tizen
```

Change the fallback for all default builds by editing `vkara.defaultTvUrl` in
`apps/tizen/package.json` (single SoT). Do not put a production URL back into
`main.js`.

## Web TV runtime dependency

The shell only launches `/tv`. Chrome 85 downlevel / polyfills / `Cache-Control`
for the hosted app are a **separate** web concern — see
[#6](https://github.com/lehuygiang28/vkara/issues/6).

## Build

Requirements: `bash`, `zip`, `python3`, `npm`.

```sh
bun run build:tizen                 # stage once → WGT + TizenBrew
bun run build:tizen:wgt             # unsigned dist/vKara.wgt
bun run build:tizen:tizenbrew       # dist/tizenbrew + vkara-tv-<ver>.tgz
```

### Pipeline (stage mutates once; adapters only package)

```
src/  ──stage-shell.sh──►  dist/stage/  ──check-stage.sh──►  adapters
                              │                                │
                              │                     ┌──────────┴──────────┐
                              │                     ▼                     ▼
                              │              build-wgt.sh          pack-tizenbrew.sh
                              │                     │                     │
                              │                     ▼                     ▼
                              │            dist/vKara.wgt        dist/tizenbrew/ + .tgz
```

| Script | Role |
|--------|------|
| `scripts/lib.sh` | Shared paths + package.json readers (sourced) |
| `scripts/stage-shell.sh` | Copy `src` → `dist/stage`, bake URL (`json.dumps`), stamp version |
| `scripts/check-stage.sh` | Pure assertions (no file mutation) |
| `scripts/build-wgt.sh` | Zip `dist/stage` → unsigned `.wgt` |
| `scripts/pack-tizenbrew.sh` | Allowlisted copy → npm pack `@vkara/tv` |
| `scripts/build-all.sh` | Orchestrate stage → check → both adapters |

Version SoT: `package.json` `"version"`. WGT ids: `VkaraApp01` / `VkaraApp01.vkara`.
Icon: `src/icon.png` (= `apps/web/public/icons/icon-512.png`).

## Sideload WGT

1. TV Developer Mode: Apps → `12345` → On → Host PC IP → reboot.
2. [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) → custom `.wgt` → `dist/vKara.wgt`.

Unsigned by design (Apps2Samsung re-signs). Optional Studio sign against the
**staged** tree (has `config.xml`):

```sh
tizen package -t wgt -s <profile> -- apps/tizen/dist/stage
```

## TizenBrew

1. Install [TizenBrew](https://github.com/reisxd/TizenBrew).
2. Module Manager → add `@vkara/tv`.
3. If jsDelivr fails, sideload WGT from a `tizen-v*` [GitHub Release](https://github.com/lehuygiang28/vkara/releases).

Private workspace package `@vkara/tizen` is never published — only generated
`dist/tizenbrew` as npm package **`@vkara/tv`** under the `@vkara` npm org
(unscoped `vkara` is blocked by npm similarity rules vs `vary`/`karma`).

## Maintainer release

1. Bump `apps/tizen/package.json` `"version"` (and `vkara.defaultTvUrl` if needed) in a PR.
2. Merge, then: `git tag -a tizen-vX.Y.Z -m "tizen shell X.Y.Z" && git push origin tizen-vX.Y.Z`
3. `release-tizen.yml` builds with **default** URL (env unset), publishes
   `@vkara/tv` with npm provenance, attaches `vKara.wgt`.

Do **not** use Docker `v*` tags. Web deploys ≠ shell release.

Requires npm Trusted Publisher for package `@vkara/tv`, workflow
`release-tizen.yml` on `lehuygiang28/vkara`. First publish may need
`npm publish --access public` once from your account to create the package,
then bind Trusted Publisher.

## Layout

```
package.json                 version + vkara.defaultTvUrl
src/                         shell SoT (placeholder only — no host)
scripts/
  lib.sh                     shared helpers
  stage-shell.sh             bake + stamp into dist/stage
  check-stage.sh             contracts
  build-wgt.sh               zip → vKara.wgt
  pack-tizenbrew.sh          npm module @vkara/tv
  build-all.sh               orchestrator
tizenbrew/package.template.json
dist/                        gitignored build output
```
