## 1. Port chrome85 TV runtime stack onto main

- [x] 1.1 Add `apps/web/scripts/lib/collect-files.mjs`, `tv-downlevel.mjs`, and `tv-verify.mjs` from `alfrededison/main` (adapt imports/paths as needed)
- [x] 1.2 Add `apps/web/public/tv-polyfills.js` and load it `beforeInteractive` from the root layout
- [x] 1.3 Port CSS fallbacks (`globals.css` vh, `tv-tokens.css` aspect-ratio `@supports`) if still missing on `main`
- [x] 1.4 Add `Cache-Control: no-store, must-revalidate` for `/tv` and `/:locale/tv` in `next.config.ts`
- [x] 1.5 Wire `package.json`: `browserslist`, build chain `next build && tv-downlevel && tv-verify`, add `esbuild` + `acorn` deps

## 2. Retarget to Chrome 76

- [x] 2.1 Set browserslist / `TV_CHROME_TARGET` default to `chrome 76` / `chrome76`; update script comments
- [x] 2.2 Set `tv-verify` acorn `ecmaVersion` to 2019 (or the lowest level that still matches esbuild output); document any empirical bump
- [x] 2.3 Extend polyfills with Chrome 76→85 gaps used by the app (at least `String.prototype.replaceAll`; add `Promise.any` only if needed)
- [x] 2.4 Run `bun run build` in `apps/web` and fix downlevel/verify failures until green

## 3. Docs + issue

- [x] 3.1 Update `docs/standalone-tv-deployment.md` and `apps/tizen/README.md` web-runtime notes to Chrome 76 / Tizen 6.0 (remove chrome85-only floor language)
- [x] 3.2 Update GitHub issue #6 title/body/acceptance to chrome76 / Tizen 6.0 (close when landed + device smoke)

## 4. Device confirmation

- [ ] 4.1 Smoke `/tv` on Tizen 6.0 after deploy (React mounts; no white-screen from SyntaxError)
