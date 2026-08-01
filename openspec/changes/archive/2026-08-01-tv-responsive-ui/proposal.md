## Why

`/tv` looks correct on large living-room CSS viewports, but on small TVs, low-resolution panels, and Android TV WebViews (often ~960×540 CSS at 2× DPR) chrome, type, queue, and overlays feel oversized and non-relative. The current system mixes fluid `clamp` tokens with a width-only `min-width: 768px` rem freeze and phone-style Tailwind breakpoints, so short-but-wide TVs keep desktop-sized UI while compact crush never applies.

## What Changes

- Introduce a single TV density scale for `[data-tv-route]` so typography, hit targets, spacing, queue, settings, lobby, and Next Up share one proportional model across CSS viewports.
- Remove or replace the width-only `@media (min-width: 768px)` rem freeze that locks transport/queue to large fixed rem on nearly all real TVs.
- Retire phone `sm`/`md`/`lg` density ladders inside TV chrome components in favor of tokens / rem that track the TV scale; keep layout-only media queries (short/wide reflow).
- Keep dual-gate compact crush for phone/emulator preview; add height-budget densification for living-room short viewports (width-independent).
- Drive fixed QR / title reserve from scaled tokens with a CSS-px scan floor; keep expand via `transform` only.
- Harden Chrome 76 CSS safety for layout: static fallbacks before `clamp`/`min`/`max` on touched TV tokens; extend `tv-verify` (and document CSS floor) so downlevel/verify match what `/tv` actually ships.
- Lock a viewport smoke matrix (including Android TV short CSS) as acceptance for this change.

## Capabilities

### New Capabilities
- `tv-responsive-layout`: Viewport-relative density and height-budget rules for the dedicated `/tv` UI so lobby, idle QR, player chrome, queue, settings, and Next Up remain usable from ~960×540 CSS through 1080p/4K without oversized chrome on short TVs.

### Modified Capabilities
- `tv-chrome76-runtime`: Extend CSS downlevel/verify requirements beyond `inset`/`:is`/`:where`/`dvh`/`:focus-visible` to cover layout-critical math (`clamp`/`min`/`max`) via dual-declaration policy or an explicit raised CSS layout floor documented alongside the JS Chrome 76 floor.
- `tv-ui-performance`: Clarify that density scaling MUST NOT use root `transform`/`zoom`, MUST keep QR canvas size stable (transform expand only), and MUST NOT introduce layout-animated size changes when adapting to short viewports.

## Impact

- **Web TV UI:** `apps/web/src/app/tv-tokens.css`, TV layout, Tailwind TV variants, and components under `apps/web/src/components/pages/tv/` (+ related idle QR / focus style helpers).
- **Build gates:** `apps/web/scripts/tv-downlevel.mjs`, `apps/web/scripts/tv-verify.mjs` (policy/gates for layout CSS).
- **Runtime polyfills:** `apps/web/public/tv-polyfills.js` stays JS-API-only (out of scope for visual scale).
- **Android TV / Tizen shells:** No native density rewrite required; they continue to host `/tv`. Optional docs for CSS viewport smoke matrix only.
- **Non-goals:** Redesigning visual language (colors/scrims/focus language), pure-% rewrite of every panel, or whole-UI `transform` zoom.
