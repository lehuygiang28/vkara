## 1. Land shared shell base

- [x] 1.1 Land `apps/tizen` shell SoT (src, icon, config.xml, README) on a feature branch from current `main`
- [x] 1.2 Add private workspace package `@vkara/tizen` with a real semver SoT
- [x] 1.3 Wire root scripts `build:tizen` / env passthrough for `VKARA_TV_URL` (WGT-only OK at this step)
- [x] 1.4 Confirm web TV runtime dependency status on `main` (chrome85 downlevel / polyfills / `/tv` no-store); open or link blocker issue if missing — do not re-implement inside packaging

## 2. Shared stage pipeline

- [x] 2.1 Add `scripts/stage-shell.sh`: copy `src` → `dist/stage`, validate/bake `VKARA_TV_URL`, stamp version into staged `config.xml`
- [x] 2.2 Refactor `build-wgt.sh` to package only from `dist/stage` (no second URL inject path)
- [x] 2.3 Add a small contract check (script or test) that staged `main.js` contains the expected `APP_URL` after bake
- [x] 2.4 Document stage outputs and required host tools (`bash`, `zip`) in `apps/tizen/README.md`

## 3. WGT sideload adapter

- [x] 3.1 Ensure `bun run build:tizen:wgt` (and `build:tizen`) produce unsigned `dist/vKara.wgt` with stable package id `VkaraApp01` (application id `VkaraApp01.vkara`)
- [x] 3.2 Fail clearly when `zip` is missing; keep signing out of the default path
- [x] 3.3 Update standalone/TV docs for Apps2Samsung sideload + `VKARA_TV_URL` self-host rebuild
- [x] 3.4 PR/`main` CI: build WGT (+ pack) and upload artifacts; never `npm publish`

## 4. TizenBrew module adapter

- [x] 4.1 Add `tizenbrew/package.template.json` (`packageType: app`, `appName`, `appPath`, `keys`) and `pack-tizenbrew.sh` writing `dist/tizenbrew/` + `npm pack`
- [x] 4.2 Wire `build:tizen:tizenbrew`; ensure tarball allowlist excludes private workspace noise and omits requiring `config.xml`
- [x] 4.3 Align published package version with shell semver from the same stage as WGT; set `publishConfig.access=public` and `repository.url` for provenance linkage
- [x] 4.4 Document TizenBrew install (module name, Module Manager steps) and WGT fallback if jsDelivr fails
- [x] 4.5 Device-test on Tizen 6.0+: install via TizenBrew, verify handoff (production Sentry shows Tizen 6.0 hitting `/tv`); 6.5+ smoke / screensaver parity optional follow-up
- [x] 4.6 Bootstrap Trusted Publisher / first package existence; prefer CI publish on `tizen-v*` (manual short-lived token only as break-glass, then revoke) — covered by 5.8/5.9 (`@vkara/tv` OIDC publish)

## 5. Release CI (TizenBrew + WGT)

- [x] 5.1 Document maintainer release flow: bump `apps/tizen/package.json` version in PR → merge → annotated tag `tizen-vX.Y.Z` (do not reuse Docker `v*` tags; no release-it for MVP)
- [x] 5.2 Add PR/`main` packaging job: `bun run build:tizen`, contract checks, `npm pack` dry-run, upload WGT + `.tgz` artifacts; never `npm publish`
- [x] 5.3 Add `.github/workflows/release-tizen.yml` on `push.tags: ['tizen-v*']` with `permissions: id-token: write` and `contents: write`
- [x] 5.4 Release job: Bun install/build both adapters; gate tag semver == `apps/tizen` version == `dist/tizenbrew` version
- [x] 5.5 Publish with Node 24 + npm CLI from `apps/tizen/dist/tizenbrew`: `npm publish --access public --provenance` (no steady-state `NPM_TOKEN`)
- [x] 5.6 Ensure generated `dist/tizenbrew/package.json` has public name `@vkara/tv`, `publishConfig.access=public`, and correct `repository.url`
- [x] 5.7 Create GitHub Release for the tag; attach `dist/vKara.wgt` (+ optional `.tgz`)
- [x] 5.8 npmjs.com: bootstrap `@vkara/tv` (`npm publish --access public`); configure Trusted Publisher for repo `lehuygiang28/vkara`, workflow `release-tizen.yml`; confirm repo is public (required for provenance) — `@vkara/tv@0.0.2` live
- [x] 5.9 Bootstrap first package if needed, then verify OIDC-only path and revoke any temporary token — published via GitHub Actions OIDC + provenance
- [x] 5.10 Docs: release cadence + tag convention + “web deploy ≠ shell release”
- [x] 5.11 Root README mentions both Tizen delivery paths; Android TV and release-it explicitly out of scope for this change
