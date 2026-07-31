## Why

Samsung Tizen TVs need a thin local shell to reach the hosted `/tv` experience (privileges, media keys, splash/offline), but operators want two install paths: classic **unsigned WGT sideload** (Apps2Samsung / Tizen Studio) and **TizenBrew npm modules** (one-click install without fighting Tizen Studio). Without a shared packaging base, hand-off logic, URL baking, and versions drift across two trees.

## What Changes

- Land a shared **Tizen shell** source of truth in the monorepo (`apps/tizen`) — splash, offline/timeout UI, UA badge, screensaver-off, media-key registration, top-level `location.replace` to hosted `/tv` with `launch=` cache bust.
- Add a **shared stage** step that applies `VKARA_TV_URL` and a single shell version, then two **format adapters**:
  - **WGT**: zip unsigned `dist/vKara.wgt` for sideload.
  - **TizenBrew**: pack a public scoped npm module (`packageType: "app"`) from the same staged tree.
- Root/turbo scripts: `build:tizen` (both), plus per-target `build:tizen:wgt` and `build:tizen:tizenbrew`.
- Docs for dual install + self-host one-command rebuild (`VKARA_TV_URL=… bun run build:tizen`).
- CI builds/validates packaging on PRs; **tag-driven GitHub Actions release** (`tizen-v*`) builds on CI, publishes `vkara` with **npm Trusted Publishing + provenance** from `dist/tizenbrew`, and attaches the unsigned WGT to the same GitHub Release (not every web deploy; not Docker `v*` tags).
- Reference (do not re-own) web TV runtime compat on `apps/web` (chrome85 downlevel / polyfills / `/tv` `no-store`) — land or depend on that work separately if still missing from `main`.

**Non-goals:** Android TV / Fire TV / webOS; Samsung Seller Office store submission; embedding Next.js inside WGT/npm; TizenBrew `mods` as primary; runtime multi-URL picker in the shell; **release-it** (plain tag + Actions for MVP).

## Capabilities

### New Capabilities

- `tizen-shell-packaging`: Shared thin shell SoT, stage pipeline, version/URL bake, ES5/chrome85-safe shell constraints, stable WGT package id.
- `tizen-wgt-sideload`: Unsigned `.wgt` build, Apps2Samsung-oriented sideload docs, optional Studio sign path documented only.
- `tizenbrew-module-publish`: TizenBrew `packageType: app` npm pack/publish contract (`appName`, `appPath`, `keys`), install docs, tag-release CI with OIDC provenance.

### Modified Capabilities

<!-- none — no existing openspec/specs cover Tizen packaging; web TV downlevel remains a separate web concern -->

## Impact

- **New/expanded:** `apps/tizen` (src, stage/build scripts, TizenBrew template), root `package.json` scripts, `turbo.json` env for packaging, docs (`standalone-tv-deployment`, tizen READMEs), `.github/workflows` packaging validate + `release-tizen.yml`.
- **Related (out of this packaging change’s ownership, may be a dependency):** `apps/web` TV downlevel/polyfills/`Cache-Control` if not yet on `main` (see [#6](https://github.com/lehuygiang28/vkara/issues/6)).
- **Unchanged:** room/WebSocket protocol, API surface, Android TV, signed store pipeline, Docker `v*` release path.
- **Ops:** Bump `apps/tizen` version → push tag `tizen-vX.Y.Z` → CI publishes npm (provenance) + GitHub Release with WGT; web deploys alone update karaoke UI without republishing packaging.
- **npm prerequisites:** unscoped package name `vkara` + Trusted Publisher bound to workflow `release-tizen.yml` (no steady-state `NPM_TOKEN`).
