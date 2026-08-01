## Context

The dedicated `/tv` UI sizes primarily through `[data-tv-route]` custom properties in `tv-tokens.css` using `clamp(rem, vh/vw, rem)`, plus Tailwind rem utilities and phone breakpoints (`sm`/`md`/`lg`). Large FHD/4K CSS viewports look acceptable. Short living-room viewports — especially Android TV WebViews reporting ~960×540 CSS (1080p @2×) — keep oversized chrome because:

1. `@media (min-width: 768px)` freezes transport/queue tokens to large fixed rem (and a fixed `28rem` expanded queue).
2. Compact crush only runs when `max-height: 600px` **and** `max-width: 900px`, so wide-short TVs escape densification.
3. Queue cards, chrome padding, settings rails, and focus helpers use Tailwind rem ladders that do not share one density lever.
4. Fixed 72px QR and “never crush Next Up” ignore height budget on short screens.

Hard review also found that `clamp`/`min`/`max` are Chrome **79+**, while `tv-chrome76-runtime` claims a Chrome **76** floor and only gates `inset`/`:is`/`:where`/`dvh`/`:focus-visible`. `tv-polyfills.js` is JS-API-only and is not a layout lever.

**Constraints:** Tizen 6.0 (~Chrome 76) JS floor remains; Android TV / Tizen shells stay thin WebView hosts; tv-ui-performance forbids backdrop-filter and layout-animated sizes; spatial nav must keep correct hit geometry (no root `transform`/`zoom`).

## Goals / Non-Goals

**Goals:**

- One density authority for `/tv` so UI scales proportionally across small → large CSS viewports.
- Fix oversize on short-wide TVs without regressing current FHD 10-foot look (cap at today’s ceilings).
- Height-budgeted queue + Next Up on short viewports (width-independent).
- Chrome 76–honest CSS emission for touched layout tokens (static fallback + progressive math, or documented CSS layout floor).
- Extend verify so green builds match layout safety claims.
- Viewport smoke matrix as acceptance (960×540, 1280×720, 1366×768, 1920×1080, 4K CSS, phone landscape).

**Non-Goals:**

- Pure-% rewrite of every panel.
- Whole-UI `transform: scale` / `zoom`.
- Container queries / `cqw` (above Chrome 76 floor).
- Changing Android/Tizen shell native overlay typography as the primary fix.
- Redesigning brand colors, scrims, or focus language.
- Full historical audit of every untouched `clamp` in the repo in MVP (touched tokens + verify policy first).

## Decisions

### D1 — TV root rem scale + fluid tokens (not transform, not pure %)

**Choice:** Cap density at today’s FHD sizes via a TV-scoped root `html` `font-size` (fallback `16px`, then progressive `clamp`/`vmin`) and keep/refine `[data-tv-route]` tokens. Layout structure stays flex/grid/%/`vh`.

**Why:** Root rem scales tokens **and** existing Tailwind rem utilities with minimal churn. Transform zoom breaks fixed positioning, focus rects, and spatial-nav hit testing. Pure % is insufficient for type/hit targets/QR.

**Alternatives considered:**
- `--tv-ui-scale` × tokens only — needs migrating every Tailwind rem class; higher churn for MVP.
- JS setter for `min(w/1920, h/1080)` — reserved if CSS-only ladder proves insufficient; prefer CSS-first.

**Implementation note:** Rem is relative to `html`. Set scale from TV layout (not `:has()`, unsupported on Chrome 76). Reset / do not affect non-TV routes.

### D2 — Delete width-only ≥768 rem freeze; optional large bump needs height too

**Choice:** Remove `@media (min-width: 768px)` fixed rem overrides for transport/queue heights. If a discrete “large living room” bump is needed later, gate with `(min-width: …) and (min-height: …)`.

**Why:** This freeze is the primary oversize path on ~960×540. Base vh clamps (with static fallbacks) already cap at today’s maxima on tall FHD.

**Keep:** Layout-only width rules (chrome pad steps may become tokenized; Next Up two-column; lobby short-height side-by-side).

### D3 — Split phone crush vs living-room short height budget

**Choice:** Keep dual-gate compact MQ `(max-height: 600px) and (max-width: 900px)` for phone/emulator type crush. Add separate **height-budget** densification for short viewports regardless of width (queue expanded max as vh fraction / chrome budget; Next Up padding/action mins reduce or shell scrolls with `min-height: 0`).

**Why:** Height-only type crush previously hurt 2× DPR living-room TVs; escaping crush entirely left chrome unusable. Separate “don’t crush 10-foot type” from “fit shelf into viewport.”

### D4 — Single scale owner: migrate TV density off phone Tailwind breakpoints

**Choice:** Queue card width, chrome pad, settings rail max-width, progress thumb/type, settings icon plates move to tokens or rem without `sm`/`md`/`lg` density steps. Align or remove unused `tv-small`/`tv-narrow`; keep/refine `tv-wide-short` as layout-only.

**Why:** Dual scales (tokens vs Tailwind) make crush/scale incomplete.

### D5 — QR: scaled token + px floor; expand via transform only

**Choice:** Drive canvas/reserve from TV tokens; keep `QR_SIZE` synced; never resize canvas for expand (performance + scan stability). Floor ≥ ~64 CSS px; target ~72–96 at FHD.

### D6 — Chrome 76 CSS policy: dual-declare math; extend verify; don’t invent clamp codemod

**Choice:** For every touched TV token using `clamp`/`min`/`max`: author `property: <static rem/vh/calc>;` then progressive math. Extend `tv-verify` to fail ungated math in TV CSS (or enforce dual-declare convention). Prefer **not** heuristic rewrite of clamp in `tv-downlevel.mjs`. Document that JS floor remains Chrome 76; layout-critical CSS must be fallback-safe.

**Also:** Prefer margins/grid over new flex `gap`-only spacing on critical TV clusters if targeting strict 76 layout; keep existing longhands / aspect-ratio `@supports` patterns.

**Polyfills:** No layout polyfills in `tv-polyfills.js`.

### D7 — Cap scale so large TVs stay visually identical

**Choice:** `font-size` / scale max = current 16px FHD reference. Never scale *above* today’s large-TV ceilings.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Hit targets too small at scale floor | `--tv-scale-min` / ~12px root floor; transport/settings action rem floors; never drop focus outline below 2px |
| QR unscannable | CSS-px floor + real-camera check on 960×540 / 720p |
| Spatial nav geometry wrong | No root transform/zoom; scale via font-size + rem only |
| Root rem affects unexpected rem on TV page | Scope carefully to TV document; audit shared layout wrappers |
| Chrome 76 still drops untouched clamps | Touched-path dual-declare + verify; full audit follow-up |
| Flex `gap` missing on true Chrome 76 | Audit critical clusters; margin/grid fallbacks where needed |
| Visual regress on FHD | Cap at 16px; screenshot before/after at 1920×1080 |
| Resize thrash if JS scale added later | Debounce; CSS-first avoids this in MVP |
| Next Up overflow after densify | Height-budget rules + optional shell scroll |

## Migration Plan

1. Land token/root-scale + freeze removal behind normal web deploy (no feature flag required; CSS-only).
2. Verify production build (`tv-downlevel` + `tv-verify`) still green with new gates.
3. Smoke matrix on desktop device mode; spot-check Android TV WebView short CSS.
4. Rollback = revert the CSS/token PR; shells unchanged.

## Open Questions

1. Exact numeric floor for root font-size (proposal: ~12px / 0.75×) vs slightly higher for 10-foot readability on 540-tall CSS — validate during implementation smoke.
2. Whether Next Up short path should densify in place or allow one-axis scroll inside the shell — prefer densify first, scroll only if content still clips.
3. Whether to raise documented **CSS layout floor** to Chrome 79+ while keeping JS at 76 — only if dual-declare proves too costly; default is dual-declare and stay honest about 76.
