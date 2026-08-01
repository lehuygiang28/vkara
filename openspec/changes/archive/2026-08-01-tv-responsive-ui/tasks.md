## 1. Density foundation

- [x] 1.1 Add TV-scoped root `html` font-size scale (static `16px` fallback, then progressive `vmin`/`clamp` capped at 16px) from the TV layout path — not `:has()`
- [x] 1.2 Document scale floors/ceilings in `tv-tokens.css` comments (reference 1920×1080, min ~12px / short Android TV)
- [x] 1.3 Remove `@media (min-width: 768px)` rem freeze for transport/queue tokens; keep base fluid clamps with static fallbacks before every touched `clamp`/`min`/`max`
- [x] 1.4 Add width-independent short-viewport height-budget rules for expanded queue max height (vh fraction / chrome budget)

## 2. Component density migration

- [x] 2.1 Replace queue card `sm`/`md`/`lg`/`xl` width ladder with TV token / scaled rem width
- [x] 2.2 Move player chrome padding / gaps off phone breakpoints onto TV tokens or scaled rem
- [x] 2.3 Move settings rail max-width, row gaps, and icon plate sizes onto tokens / scaled rem
- [x] 2.4 Align playback progress thumb/label sizes with TV scale (drop `md:` density)
- [x] 2.5 Fold Next Up padding/title/action mins into height-budget densification (keep on-screen primary actions)
- [x] 2.6 Sync fixed QR canvas + title reserve tokens with scale and ≥64px CSS floor; keep transform-only expand

## 3. Variants, focus, and short layout

- [x] 3.1 Align or remove unused Tailwind `tv-small` / `tv-narrow`; keep `tv-wide-short` as layout-only reflow
- [x] 3.2 Keep dual-gate compact MQ for phone/emulator only; ensure living-room short path uses height budget (not phone crush)
- [x] 3.3 Spot-check lobby short-height side-by-side + settings focus helpers still D-pad usable at 960×540
- [x] 3.4 Tokenize or leave fixed focus ring px with documented minimum; ensure rings clear queue focus pad after scale

## 4. Chrome 76 verify / downlevel

- [x] 4.1 Extend `tv-verify.mjs` to fail ungated TV `clamp`/`min`/`max` (or enforce dual-declare convention) for `[data-tv-route]` CSS
- [x] 4.2 Confirm `tv-downlevel.mjs` still covers `inset`/`:is`/`:where`/`dvh`/`:focus-visible`; do not add heuristic clamp rewrites
- [x] 4.3 Audit critical TV flex clusters for Chrome-76-unsafe flex `gap`-only spacing; add margin/grid fallbacks where needed
- [x] 4.4 Confirm `tv-polyfills.js` remains JS-API-only (no density/layout work)

## 5. Acceptance matrix

- [x] 5.1 Smoke lobby, idle QR, playing+chrome+peek, queue expanded, settings, Next Up at 960×540, 1280×720, 1366×768, 1920×1080
- [x] 5.2 Confirm 1920×1080 before/after stays within ±10% of previous large-TV sizes
- [x] 5.3 Run production build with downlevel + verify green
- [x] 5.4 Spot-check Android TV WebView short CSS (or device-mode equivalent) for oversize/clip regressions
