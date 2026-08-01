# @vkara/tv

[npm](https://npm.im/@vkara/tv) · [source](https://github.com/lehuygiang28/vkara/tree/main/apps/tizen)

Samsung TV launcher for [TizenBrew](https://github.com/reisxd/TizenBrew) (Tizen 6.0+, 2021+). Thin local shell: splash / offline UI, media keys, then top-level handoff to the hosted `/tv` karaoke app.

Not a Node library — install via TizenBrew Module Manager, not `npm install`.

## Install

1. Install [TizenBrew](https://github.com/reisxd/TizenBrew) on the TV.
2. Module Manager → add **`@vkara/tv`**.
3. Launch the **vKara** tile → splash → hosted `/tv`.

If jsDelivr / Module Manager fails, sideload the unsigned WGT from a `tizen-v*` [GitHub Release](https://github.com/lehuygiang28/vkara/releases) with [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung).

## Package contract

| Field | Value |
|-------|--------|
| `packageType` | `app` |
| `appName` | `vKara` |
| `appPath` | `index.html` |
| Files | `index.html`, `js/main.js`, `css/style.css`, `icon.png`, `package.json` |

No `config.xml` (WGT-only). Media keys are declared in `package.json` for TizenBrew parent registration.

## URL bake

Official releases bake the default host from the monorepo (`vkara.defaultTvUrl`). Web deploys update `/tv` without a new shell release — republish only when the wrapper, keys, or default URL changes.

Forks with a custom host: rebuild the shell and publish under **your** npm scope. Do not overwrite `@vkara/tv`.

See [apps/tizen/README.md](https://github.com/lehuygiang28/vkara/blob/main/apps/tizen/README.md) for build, WGT sideload, and maintainer release (`tizen-v*`).

Inspired by [@alfrededison](https://github.com/alfrededison)’s Tizen shell work in [#5](https://github.com/lehuygiang28/vkara/pull/5).
