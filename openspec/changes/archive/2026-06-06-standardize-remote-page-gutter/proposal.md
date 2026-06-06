## Why

The mobile remote page applies horizontal inset in many places with slightly different rules. Header, video list, now-playing bar, and bottom nav do not share a single visual edge, which reads as misaligned on narrow phones and makes future chrome changes fragile. We need one rem-based gutter contract backed by CSS tokens and Tailwind utilities so every chrome band aligns without per-component padding hacks.

## What Changes

- Introduce `--vkara-page-gutter-inline` (and start/end variants) in `:root`, derived from `max(1rem, env(safe-area-inset-*))`, as the single source of truth for horizontal page inset on the remote shell.
- Unify existing utilities: `px-safe-offset`, `pl-safe-offset`, `pr-safe-offset`, and positioned `left-safe-offset` / `right-safe-offset` MUST resolve from the same token (eliminate the current 1rem vs 0.75rem split).
- Export a shared constant (e.g. `PAGE_GUTTER_CLASS = 'px-page-gutter'`) from `remote-chrome.ts` alongside existing chrome height vars so TS and CSS stay in sync.
- Apply gutter at shell anchor points (search header row, list scroll body, now-playing bar, bottom nav) and remove redundant nested horizontal padding (e.g. VideoList footer double `px-safe-offset`, list row inner offset policy).
- Fix results-search header alignment: back button + gap must not push the search field past the list content edge (grid-based header or equivalent).
- Align floating controls (scroll-to-top, horizontal rails) to the same gutter token.
- Document gutter ownership rules: shell owns horizontal inset; children use vertical spacing and internal gap only unless explicitly full-bleed.

## Capabilities

### New Capabilities

- `remote-page-gutter`: CSS token contract, Tailwind utilities, shell application rules, and visual alignment requirements for the mobile remote page horizontal inset.

### Modified Capabilities

- _(none — layout contract only; no API or product behavior changes)_

## Impact

- **CSS**: `apps/web/src/app/globals.css` — new tokens, updated safe-offset utilities, optional alias class `px-page-gutter`.
- **Layout contract**: `apps/web/src/lib/remote-chrome.ts` — export gutter class name / CSS var keys.
- **Remote shell components**: search header, video list toolbar, `VideoList`, `VideoListItem`, `NowPlayingBar`, `MobileBottomNav`, `PlayerControlsTabs`, panel overlays, curated sections, horizontal scroll rail, scroll-to-top.
- **Overlays (follow-up within same change if time)**: voice search overlay currently uses raw `px-3` / `px-5`; migrate to gutter token for consistency.
- **Tests**: optional snapshot or layout smoke tests; manual QA matrix at 320–430px widths.
- **No breaking API changes**; visual-only alignment fix for remote web UI.
