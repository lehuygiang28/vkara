## Context

vkara’s TV UX is a **hosted** Next.js route (`/tv`). Samsung Tizen web-app runtimes are pinned (~Chrome 76 on Tizen 6.0 / 2021+; 6.5 / 2022 ≈ Chrome 85). A thin local shell is required so media keys and screensaver privileges can be applied before a **top-level** navigation to `/tv` (iframes hit third-party storage restrictions and white-screen).

Web TV runtime compat (chrome85 downlevel / polyfills / `/tv` `no-store`) is a separate concern tracked in [#6](https://github.com/lehuygiang28/vkara/issues/6).

[TizenBrew](https://github.com/reisxd/TizenBrew) loads npm/gh modules via jsDelivr. For `packageType: "app"`, the runtime serves module files from `http://127.0.0.1:8081/module/<pkg>/<appPath>` and registers `keys` before launch. Operators also want classic **unsigned WGT** sideload via Apps2Samsung.

**Stakeholders:** maintainers shipping TV support; self-hosters/forks pointing at their own frontend; end users on Developer Mode TVs.

## Goals / Non-Goals

**Goals:**

- One shell source of truth; two packaging adapters (WGT + TizenBrew `app`).
- Shared stage bakes `VKARA_TV_URL` + shell semver into both artifacts.
- Monorepo scripts/turbo support both builds without depending on `build:web`.
- Docs cover dual install and one-command self-host rebuild.
- Stable WGT package id (`VkaraApp01`) for in-place upgrades.

**Non-Goals:**

- Android TV / Fire TV / webOS.
- Samsung Seller Office / CI-held author certificates (default path stays unsigned).
- Bundling Next.js into WGT or npm.
- TizenBrew `mods` as primary delivery.
- Runtime multi-tenant URL picker in the shell.
- Re-implementing chrome85 downlevel inside packaging (stays on `apps/web`).

## Decisions

### D1 — Layout: shared shell in `apps/tizen`, stage once, two adapters

```
apps/tizen/
  src/                         # SoT only (APP_URL placeholder — no host)
  scripts/
    lib.sh                     # shared paths + package.json readers
    stage-shell.sh             # src → dist/stage; bake URL (json.dumps) + version
    check-stage.sh             # pure contracts
    build-wgt.sh               # zip dist/stage → dist/vKara.wgt (no bake)
    pack-tizenbrew.sh          # allowlisted pack → npm @vkara/tv (no bake)
    build-all.sh               # stage once → both adapters
  tizenbrew/package.template.json
  package.json                 # @vkara/tizen private; version + vkara.defaultTvUrl
```

**Rationale:** Matches existing WGT shape; avoids duplicating splash/handoff; clear adapter boundary.

**Rejected:** Separate `apps/tizen` vs `apps/tizenbrew` source trees. Rejected: generating WGT from published npm (local loop couples to jsDelivr).

### D2 — TizenBrew primary type = `app` (not `mods`)

| | `app` | `mods` |
|--|-------|--------|
| Runtime | Local proxy serves shell HTML | Navigate `websiteURL` + inject `main` |
| Parity with WGT | Same splash → handoff | Loses local splash/offline unless reimplemented as inject |
| Fit for hosted Next `/tv` | Thin launcher then leave | Fights Next boot; weaker offline UX |

**Rationale:** Proven model is local privileges + splash, then top-level navigate to hosted `/tv`. `mods` deferred unless product later wants inject-only.

Published package name (from `dist/tizenbrew`, not the private workspace package): `@vkara/tv` (unscoped `vkara` rejected by npm similarity policy).

### D3 — Build graph independent of web

```
stage-shell  →  build:tizen:wgt       → dist/vKara.wgt
             →  build:tizen:tizenbrew → npm pack (.tgz)
build:tizen  = both
```

- Root `build:tizen` runs `apps/tizen` scripts directly (not part of default monorepo `turbo build`). Passthrough env: `VKARA_TV_URL`.
- No dependency on Next/`tv-downlevel` at package time — UI updates via web deploy.

### D4 — Version and URL bake

- **Version SoT:** `apps/tizen/package.json` `"version"` (semver). Stage stamps `config.xml` + TizenBrew `package.json`.
- **URL SoT (fallback):** `apps/tizen/package.json` → `vkara.defaultTvUrl`. Committed `src/js/main.js` keeps placeholder `__VKARA_TV_URL__` only — **no production host in source**.
- **Override:** `VKARA_TV_URL` (`http://` or `https://`) at stage; safe token replace (reject `'`, newlines). Adapters never re-bake.
- Official CI release leaves `VKARA_TV_URL` unset so published `@vkara/tv` bakes `vkara.defaultTvUrl`.
- No TV-side runtime env for URL in MVP.

### D5 — CI vs operator

| Step | PR / `main` CI | Tag release CI (`tizen-v*`) | Operator |
|------|----------------|-----------------------------|----------|
| Stage + build WGT + TizenBrew pack | Yes (validate) | Yes | Local `bun run build:tizen` |
| `npm pack` dry-run / inspect tarball | Yes | Yes (pre-publish) | Optional |
| Upload CI artifacts (WGT, `.tgz`) | Yes (PR artifacts) | Yes (Release assets) | — |
| `npm publish` with provenance | **No** | **Yes** | Break-glass only |
| GitHub Release | No | Yes (`tizen-vX.Y.Z`) | — |
| Sideload / Developer Mode | No | No | Apps2Samsung / Studio |
| Samsung cert sign | No | No | Optional local |
| Web chrome85 gates | Existing web CI | — | — |

Default WGT remains **unsigned** (Apps2Samsung re-signs per DUID).

### D6 — Self-host / fork

One rebuild:

```bash
VKARA_TV_URL=https://your.host/tv bun run build:tizen
```

Forks that want TizenBrew without per-TV rebuild publish their own scoped package (optional later: `VKARA_TIZENBREW_NAME` template override). Do not maintain a second packaging repo. Forks MUST NOT inherit the upstream Trusted Publisher.

### D7 — Release cadence

- **Web deploy ≠ shell release.** Karaoke UI updates when `/tv` deploys.
- **Shell release** = bump `apps/tizen` version → annotated tag `tizen-vX.Y.Z` → CI publishes npm + attaches WGT to the same GitHub Release.
- Never mutate published files at the same npm version (jsDelivr cache).
- One shell version = one release unit (npm module + sideload WGT). Do not create a separate WGT-only release channel.

### D8 — Software architecture note (shared base contract)

Shared stage tree MUST contain at least: `index.html`, `js/main.js`, `css/style.css`, `icon.png`. WGT adapter additionally includes `config.xml` (package `VkaraApp01`, application id `VkaraApp01.vkara`, `required_version` 6.0, privileges for internet / tv.inputdevice / screensaver, profile `tv-samsung`). Keep that package id stable after first public sideload (TV treats a new id as a second app). TizenBrew tarball MUST NOT require `config.xml`; MUST include allowlisted static files + generated `package.json` with `packageType`, `appName`, `appPath`, `keys`.

Shell JS/CSS MUST stay ES5 / Tizen 6.0-safe (~Chrome 76; shell runs on-device before handoff).

After handoff, `tizen` / `webapis` are unavailable — same as today’s WGT; hosted app owns in-page UX.

### D9 — Shell release tagging (`tizen-v*`, not Docker `v*`)

**Decision:** Shell releases use annotated tags `tizen-v<semver>` where `<semver>` equals `apps/tizen/package.json` `"version"` (and thus baked WGT / TizenBrew versions).

**Do not** reuse root / Docker tags `v*` — `build-push-docker.yml` already triggers on `tags: ['v*']`; coupling would push images on every shell release or force skip hacks.

**Rejected:** Root `v*` for TizenBrew; tags that omit the `tizen-` prefix; tagging without bumping `apps/tizen/package.json` first.

### D10 — Release tooling: plain Actions, not release-it

**Decision:** Maintainer owns the version bump in a PR. CI owns build + publish + GitHub Release assets.

**Maintainer flow:**

1. PR bumps `apps/tizen/package.json` `"version"` (and any shell changes).
2. Merge to `main`.
3. Annotated tag on the merge commit: `git tag -a "tizen-v1.2.3" -m "tizen shell 1.2.3"` and push.
4. Workflow `.github/workflows/release-tizen.yml` runs on `push.tags: ['tizen-v*']`.

**Why not release-it for this change:** nested SoT in `apps/tizen`, namespaced tags ≠ Docker `v*`, and reviewable human bumps already match the repo’s tag-driven Docker style. Extra dependency/config is not justified for MVP. Optional later: tiny `release:tizen` script that asserts clean tree and pushes `tizen-v$VERSION` — still without release-it unless changelog/multi-package orchestration becomes a product need.

### D11 — npm publish: OIDC trusted publishing + provenance

**Decision:** Publish `@vkara/tv` only from GitHub Actions on `tizen-v*` tags using npm **Trusted Publishing** (OIDC). Do **not** store a long-lived `NPM_TOKEN` for the happy path.

**Publish root:** `apps/tizen/dist/tizenbrew` (generated public package), **never** private workspace `@vkara/tizen` at `apps/tizen/`.

**Workflow intent:**

- `permissions: id-token: write` + `contents: write` on a GitHub-hosted runner.
- Bun installs/builds packaging; **npm CLI on Node 24** publishes (`npm publish --access public --provenance`).
- Keep `--provenance` explicit even though Trusted Publishing auto-attests — documents the product requirement and covers temporary token fallback if ever needed.
- Generated `dist/tizenbrew/package.json` MUST include `"name": "@vkara/tv"`, matching semver, `"publishConfig": { "access": "public" }`, and `repository.url` → `https://github.com/lehuygiang28/vkara`.
- Repo MUST remain **public** for provenance attestations.

### D12 — PR CI vs release CI split

**PR / `main` (extend `ci.yml` or add packaging workflow):**

- On `apps/tizen/**` (or always if cheap): `bun run build:tizen`
- Contract checks (URL bake, package id `VkaraApp01`, TizenBrew manifest fields)
- Pack without publish; upload WGT + `.tgz` as short-retention artifacts
- MUST NOT request `id-token: write` solely for validation; MUST NOT `npm publish`

**Tag `tizen-v*` (`release-tizen.yml`):**

- Full build with production default `VKARA_TV_URL`
- Gate: tag semver == `apps/tizen` version == `dist/tizenbrew` version
- `npm publish --access public --provenance` from `dist/tizenbrew`
- GitHub Release for the tag; attach `vKara.wgt` (+ optional `.tgz`)

### D13 — npm org / Trusted Publisher prerequisites

| Item | Requirement |
|------|-------------|
| Package | Scoped npm name `@vkara/tv` (rights to create/publish) |
| Trusted Publisher | GitHub `lehuygiang28/vkara`, workflow filename **exactly** `release-tizen.yml` |
| Permissions | Job `id-token: write` + `contents: write` |
| Secrets | No steady-state `NPM_TOKEN` for trusted-publish path |
| First publish bootstrap | Create package on npmjs + attach Trusted Publisher, **or** one short-lived granular token publish then revoke and switch to OIDC-only |
| Forks | Publish under their own scope/name |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| TizenBrew privilege parity (screensaver / webapis) weaker than WGT | Device-verify Phase 2; WGT remains fallback |
| jsDelivr blocked or stale cache | Semver bump every shell publish; document WGT fallback; optional purge job later |
| Operator confuses web deploy vs shell rebuild | Docs: “web updates karaoke; rebuild packaging only when wrapper/URL changes” |
| `@vkara/tv` Trusted Publisher / first package bootstrap | In-scope for this change; configure before enabling publish job; break-glass token then revoke |
| Accidental publish of private `@vkara/tizen` | Publish only from `dist/tizenbrew` with allowlisted files |
| Fork forgets `VKARA_TV_URL` | Docs + default clearly production upstream |
| Package id change creates duplicate TV apps | Spec: never change `VkaraApp01` after first public release |

**Trade-off:** Two install paths increase docs/support surface; worth it because they share one stage and different operator constraints (sideload vs Brew-only households).

## Migration Plan

1. Land `apps/tizen` shell SoT + packaging scripts on a feature branch.
2. Shared `stage-shell` + WGT zip from `dist/stage` only; reconcile version SoT.
3. Add TizenBrew pack adapter + docs; device-test both paths.
4. PR CI: build + pack + artifacts (no publish).
5. Configure npm Trusted Publisher; add `release-tizen.yml`; first `tizen-v*` tag publishes with provenance and attaches WGT.
6. Rollback: disable/remove publish job or stop tagging; WGT consumers keep last sideloaded/Release asset; web deploys unaffected.

If web TV downlevel is still missing on `main`, land it in a **separate** change/PR before claiming end-to-end TV readiness (packaging alone will still white-screen on Chrome 85).

## Open Questions

1. ~~Canonical production `/tv` host~~ → `package.json` `vkara.defaultTvUrl` = `https://vkara.vercel.app/tv` (change there, not in `main.js`).
2. Exact TizenBrew Module Manager install string (`@vkara/tv`) — verify on device once.
3. Whether Phase 0 also ports web `tv-downlevel` in the same PR series or a blocker PR first (recommended: blocker/dependency PR).
4. Confirm npm rights to publish `@vkara/tv` + Trusted Publisher entry for `release-tizen.yml` before enabling the publish job.
