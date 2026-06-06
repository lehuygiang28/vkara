## Context

vkara's phone remote (`apps/web` YouTube page) stacks fixed chrome bands: search header, optional list toolbar, scrollable video list, floating now-playing bar, and bottom nav. Each band currently calls `px-safe-offset` independently, but alignment still drifts because:

1. **Two inset formulas** — `px-safe-offset` uses `max(safe-area, 1rem)` while `left-safe-offset` / `right-safe-offset` use `max(safe-area + 0.75rem, 0.75rem)`, so floating controls sit ~4px inset of list content on devices without side safe areas.
2. **Nested padding** — `VideoList` applies gutter on the container and again on loading/error footers; `VideoListItem` adds `p-2` (0.5rem) inside the guttered list, so thumbnails start ~8px further in than toolbar icons.
3. **Header composition** — `ResultsSearchHeader` inserts a 44px back button + gap before the search field while the list below uses only container gutter, so the search pill and list edges do not line up in results mode.
4. **No ownership model** — 15+ files import `px-safe-offset` ad hoc; nothing defines which layer owns horizontal inset vs internal spacing.

Existing safe-area vars (`--safe-left`, `--safe-right`) and remote chrome height vars (`--vkara-mobile-nav-height`, etc.) in `remote-chrome.ts` already centralize vertical chrome. Horizontal gutter should follow the same pattern.

**Design read:** Product UI (mobile remote) for party guests, clean functional language, leaning toward CSS custom properties + Tailwind utilities + shell-level layout contract (not marketing-page patterns).

**Dials (for spacing only):** DESIGN_VARIANCE 3, MOTION_INTENSITY 1, VISUAL_DENSITY 5 — alignment fix, no new motion.

## Goals / Non-Goals

**Goals:**

- One rem-based horizontal gutter token used by all remote chrome bands and edge-aligned floating controls.
- Visual alignment: left/right content edges match across header, list, now-playing bar, and bottom nav at common mobile widths (320, 375, 390, 414, 430px).
- Maintainable contract documented in `remote-chrome.ts` and `globals.css`; new remote surfaces import one class or wrapper instead of guessing padding.
- Preserve safe-area behavior on notched devices and home-indicator spacing for bottom chrome.

**Non-Goals:**

- Redesigning typography, colors, or component visuals beyond padding alignment.
- TV / desktop player column layout (PlayerColumn floating controls may adopt tokens but full audit is optional).
- Changing touch target sizes, now-playing bar content layout, or channel line clamping (recent polish stays).
- Introducing a new npm dependency for layout.

## Decisions

### 1. Token shape and base unit

**Choice:**

```css
:root {
  --vkara-page-gutter: 1rem;
  --vkara-page-gutter-inline-start: max(var(--safe-left), var(--vkara-page-gutter));
  --vkara-page-gutter-inline-end: max(var(--safe-right), var(--vkara-page-gutter));
}
```

Utilities map to these tokens:

| Utility | Maps to |
|---------|---------|
| `px-page-gutter` / `px-safe-offset` (alias) | inline-start + inline-end |
| `pl-page-gutter` / `pl-safe-offset` | inline-start only |
| `pr-page-gutter` / `pr-safe-offset` | inline-end only |
| `left-page-gutter` / `left-safe-offset` | `left: var(--vkara-page-gutter-inline-start)` |
| `right-page-gutter` / `right-safe-offset` | `right: var(--vkara-page-gutter-inline-end)` |

**Rationale:** Single 1rem base matches current `px-safe-offset` behavior users already see on most phones; safe-area wins when larger. Using logical start/end supports RTL if added later.

**Alternatives considered:**

- Tailwind `@theme` spacing key only — rejected; safe-area requires CSS `max()` with env(), not a static theme scale.
- 0.75rem base to match old positioned offsets — rejected; would shrink list inset and regress current header/list padding.

### 2. Backward-compatible utility aliases

**Choice:** Keep `px-safe-offset` as an alias to the new token-backed rules (no mass rename in one PR). Add `px-page-gutter` as the preferred name in new code and `PAGE_GUTTER_CLASS` export.

**Rationale:** Reduces diff noise; grep can migrate incrementally.

### 3. Shell ownership vs child padding

**Choice:** Horizontal gutter applied once per vertical band at the shell boundary:

```
Remote tab column
├── SearchHeaderRow          → px-page-gutter (owns gutter)
├── VideoListToolbar         → px-page-gutter
├── VideoList scroll root    → px-page-gutter on outer wrapper only
│   └── VideoListItem        → py/gap only; remove horizontal p-2 OR use px-0 + gap unchanged
├── NowPlayingBar            → px-page-gutter
└── MobileBottomNav          → px-page-gutter
```

Full-bleed exceptions (horizontal scroll rails, divider lines) use `pl-page-gutter` on the rail track and `-mr-page-gutter` bleed pattern only where scroll peek is intentional.

**Rationale:** Single padding layer prevents double-counting; item-level horizontal padding becomes vertical-only (`py-2`) unless a full-bleed row is required.

**Alternatives:**

- `RemotePageGutter` React wrapper component — acceptable optional helper for new panels; CSS utility is sufficient for existing components.

### 4. Results search header grid

**Choice:** Replace flex row (back + field) with a 3-column grid inside the already-guttered header:

- Column 1: back button (44px)
- Column 2: search field (`minmax(0, 1fr)`)
- Gap: `gap-1.5`

Browse mode (no back button) uses the same grid with column 1 empty or omits column 1 via `grid-cols-[1fr]` vs `grid-cols-[2.75rem_minmax(0,1fr)]`.

**Rationale:** Back button consumes space inside the gutter box, so the search field's left edge aligns with list text/thumbnails below (both start at gutter + 0 after item padding policy change).

**Alternatives:**

- Negative margin on back button — rejected; fragile across safe areas.

### 5. List row inset policy

**Choice:** Change `VideoListItem` interactive row from `p-2` to `py-2` (no horizontal padding). Thumbnail left edge aligns with toolbar leading actions. Maintain `gap-3` between thumb and text.

**Rationale:** Toolbar buttons sit at gutter edge; list thumbs should match.

**Trade-off:** Slightly less hover background inset on the sides — acceptable; row still full width within gutter.

### 6. VideoList footer double padding

**Choice:** Remove `px-safe-offset` from absolutely positioned loading/error footers inside `VideoList`; parent wrapper already provides gutter.

**Rationale:** Fixes ~16px extra inset on loading states.

### 7. Bottom nav distribution

**Choice:** Keep `px-page-gutter`; optionally switch `justify-around` to `grid grid-cols-4` so icon columns distribute evenly within the gutter box (follow-up if visual QA shows edge icons drifting).

**Rationale:** Lower priority than token unification; include in migration if misalignment persists after gutter fix.

### 8. TypeScript export

**Choice:** Extend `remote-chrome.ts`:

```ts
export const PAGE_GUTTER = {
  cssVar: '--vkara-page-gutter',
  inlineStartVar: '--vkara-page-gutter-inline-start',
  inlineEndVar: '--vkara-page-gutter-inline-end',
  className: 'px-page-gutter',
} as const;
```

Use in components that build `className` programmatically (overlays, rails).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Alias drift if both old and new names persist | Document preferred `px-page-gutter`; lint comment in `globals.css`; migrate in same change for remote shell files |
| Full-bleed rails lose peek effect | Keep `pl-page-gutter` on rail + explicit trailing bleed padding using token |
| PlayerColumn controls not fully audited | Use same `left/right-page-gutter` tokens; visual spot-check only |
| Changing list item padding affects virtualized row height | Row height is fixed 100px; only horizontal padding changes — no height change |
| Voice overlay still misaligned if deferred | Include in task list as phase 3 |

## Migration Plan

1. **Phase 1 — Tokens:** Add CSS vars; rewire all safe-offset utilities to tokens; verify positioned offsets match padding utilities on iPhone SE simulator (no side safe area) and notched device.
2. **Phase 2 — Shell:** Remove double padding in VideoList; update VideoListItem horizontal policy; fix ResultsSearchHeader grid.
3. **Phase 3 — Sweep:** Replace stray raw `px-3`/`px-4` on remote overlays with gutter class; align horizontal scroll rail and scroll-to-top.
4. **Verify:** Manual matrix + existing vitest suite; optional Playwright screenshot compare if available.

**Rollback:** Revert CSS utility definitions and component class changes; no data migration.

## Open Questions

- Should curated horizontal cards use gutter on the section title only with rail `pl-page-gutter` (current pattern) or move gutter to a parent wrapper? **Recommendation:** keep rail pattern; ensure `pl/pr-page-gutter` use new tokens.
- Grid vs flex for bottom nav — decide after phase 1 visual QA.
