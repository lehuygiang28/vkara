## Why

Support floor is **Tizen 6.0 / 2021 (~Chrome 76)** — confirmed in production (Sentry `VKARA-WEB-A`). Packaging (`tizen-dual-delivery`) can hand off to `/tv`, but `main` still lacks the web TV runtime stack (downlevel / verify / polyfills / `Cache-Control: no-store`). An incomplete chrome85-oriented stack exists on `alfrededison/main` and must be ported **and retargeted** to Chrome 76 so Tizen 6.0 does not white-screen on syntax or missing APIs.

## What Changes

- Port post-build TV downlevel + verify + polyfills + layout wiring from `alfrededison/main` onto `main`.
- Retarget browserslist / `TV_CHROME_TARGET` from `chrome 85` → **`chrome 76`**; tighten verify baseline (JS parse level + CSS gates) for Chrome 76.
- Restore/add runtime polyfills for APIs used by the app that landed after Chrome 76 (e.g. `String.replaceAll`) in addition to existing post-85 shims.
- Serve `/tv` and `/:locale/tv` with `Cache-Control: no-store, must-revalidate`.
- Update docs and GitHub [#6](https://github.com/lehuygiang28/vkara/issues/6) acceptance from chrome85/Tizen 6.5 to chrome76/Tizen 6.0.
- Wire downlevel+verify into `apps/web` `build` so CI catches regressions.

**Out of scope:** Tizen shell / WGT / TizenBrew packaging; Android TV; retargeting below Chrome 76.

## Capabilities

### New Capabilities
- `tv-chrome76-runtime`: Hosted `/tv` client JS/CSS/runtime is Chrome 76-compatible via build-time downlevel+verify, polyfills, and no-store document headers.

### Modified Capabilities
- *(none — no existing main specs cover web TV engine baseline)*

## Impact

- `apps/web`: `package.json` (browserslist, build chain, `esbuild`/`acorn` deps), `scripts/tv-*.mjs`, `public/tv-polyfills.js`, root layout Script, `next.config.ts` headers, CSS fallbacks as needed.
- Docs: `docs/standalone-tv-deployment.md`, `apps/tizen/README.md` web-runtime blurb.
- Closes / retargets [#6](https://github.com/lehuygiang28/vkara/issues/6).
- Does **not** change `apps/tizen` shell (already ES5 / 6.0-safe).
