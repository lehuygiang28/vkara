## Context

vkara is a party karaoke app (phone remote + TV). Users land on browse with no query and an empty queue. Today, `BrowseSuggestionsList` shows either a generic empty state ("Search now") or a personalized feed when `hasBrowseFeedSources(profile, room)` is true (search history or `playingNow` / `historyQueue`). Queue empty uses `VideoListEmptyState` plus a manual import URL field. Full playlist import already exists via WebSocket `importPlaylist` (fetch up to 200 videos, embed filter, append, auto-play first if idle). `POST /playlist` returns videos only and drops playlist metadata from youtubei.

Operators need a maintainable catalog of starter playlists without redeploying for title changes. Users need preview-before-commit and per-song adds. UI locale (`vi` | `en`) must drive suggestion priority; content locale tags (`suggestLocales`) live in JSON because YouTube does not provide them.

## Goals / Non-Goals

**Goals:**

- JSON-driven nested catalogs (`karaoke`, `music`, …) with URL list order = display order.
- Three surfaces: browse idle (cold), queue empty, import-playlist menu.
- Preview overlay with full song list; add one song or import all.
- YouTube-sourced playlist metadata for cards and preview.
- Locale filter/sort by UI locale and `suggestLocales`.
- After import all: switch to Queue tab. After single add: stay on preview.
- Freeze browse personalized feed while curated preview is open; avoid underlying browse swapping when `playingNow` appears during preview.

**Non-Goals:**

- New WebSocket message types (reuse `importPlaylist`, `addVideo`).
- Hardcoded playlist titles/thumbnails in TypeScript.
- Changing server import semantics (append-only, embed rules, dedupe).
- TV-specific UI (remote web only for this change).
- Admin UI to edit catalog at runtime (file edit + deploy is enough for MVP).
- Batch playlist metadata API (optional follow-up).

## Decisions

### 1. Catalog package and JSON shape

**Choice:** `packages/curated-playlists/playlists.json` with `version` and `catalogs[]`, each catalog having `id`, `suggestLocales`, and `playlists` (array of YouTube URLs or `list=` URLs).

**Rationale:** Operator edits one file; array order is sort order; nested catalogs match product language (karaoke vs music).

**Alternatives considered:**

- Flat `entries[]` only — rejected; user asked for nested catalogs.
- Database-backed catalog — rejected for MVP complexity.

**Initial data:** All four operator playlists under `karaoke` with `suggestLocales: ["vi", "en"]`; `music` catalog present but may start empty (hidden in UI when no playlists).

### 2. Locale matching

**Choice:** Filter catalogs where `suggestLocales` includes current UI locale from `useCurrentLocale()`. Preserve catalog order and playlist order within catalog. No secondary-locale section in MVP unless product asks later.

**Rationale:** Matches stated rule (UI `en` → English-tagged lists first; all four lists are `vi`+`en` so order is file order).

**Alternatives:** Score-based sort with fallback section — defer until catalogs diverge by locale.

### 3. Playlist metadata and preview API

**Choice:** Extend `POST /playlist` body to accept `listId` or URL; response shape:

```ts
{
  playlist: { id, title, videoCount, thumbnails?, channelName? },
  videos: YouTubeVideo[]
}
```

Optional query/body `videoLimit` for lighter preview; `fetchAll` for full list when needed.

**Rationale:** youtubei `Playlist` already exposes fields; web today only uses video array.

**Alternatives:** Separate `/playlist/details` — rejected; one endpoint is enough.

**Import path:** Full import still uses WS `importPlaylist` (may refetch on server). Client caches preview response by `listId` in session memory to avoid duplicate calls when user previews then imports.

### 4. UI composition

**Choice:**

- Shared building blocks: `CuratedCatalogSection`, `CuratedPlaylistCard`, `CuratedPlaylistPreviewOverlay` (pattern: `SearchPageOverlay` + `VideoList` + `useVideoSearchListActions`).
- Browse: show curated starter blocks when idle, no active search results, and `showCuratedStarter` (not dismissed, not showing personalized feed as primary). Hide curated when user has search results or explicitly dismissed via search CTA.
- Queue empty: same cards below primary search empty state.
- Import popover: compact list; tap opens preview or triggers import-all per product (default: preview for consistency).

**Rationale:** Reuses existing list actions and touch targets (`min-h-11`).

### 5. Browse freeze while preview open

**Choice:** Global/session flag `curatedPreviewOpen`. When true:

- Render preview in overlay (portal).
- Do not mount or do not update `useBrowseFeed` underneath; keep showing curated starter layout (or last frozen snapshot).
- Do not transition from curated empty to personalized feed solely because `playingNow` became non-null while overlay is open.

**Rationale:** `hasBrowseFeedSources` flipping true mid-preview causes jarring swap; `useBrowseFeed` resets only on `feedKey` (search history) but the empty vs feed branch in `BrowseSuggestionsList` is the real UX bug.

**Alternatives:** Always show curated until user searches — acceptable variant; overlay freeze is the minimum fix.

### 6. Tab navigation

**Choice:** `setCurrentTab('queue')` only in handler for **Import entire playlist** success path (after WS `importPlaylist` invoked, same as today’s optimistic flow). Per-song `addVideo` does not change tab.

**Rationale:** User-confirmed open question resolution.

### 7. i18n

**Choice:** Keys under `curatedPlaylists.*` for catalog titles, section headings, buttons (`addAll`, `close`, `preview`, errors). Playlist titles from API only unless optional future `titleOverrides` in JSON.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| YouTube rate limits on 4+ playlist metadata fetches | Lazy-fetch on section visible; in-memory cache per `listId`; stagger requests |
| Double fetch (preview REST + import WS) | Acceptable for MVP; cache preview videos if needed later |
| Some videos fail embed filter on full import | Existing server behavior; show toast if import yields zero songs |
| Empty `music` catalog | Omit catalog block when `playlists.length === 0` |
| User stuck on curated | Search CTA sets `curatedDismissed` and shows personalized feed when sources exist |
| Large playlist preview payload | `videoLimit` on preview; full import via WS |

## Migration Plan

1. Ship JSON package and API response extension (backward-compatible: add fields, keep videos array if needed during transition).
2. Ship web UI behind no feature flag (catalog is small).
3. No data migration; no Redis/schema changes.
4. Rollback: remove UI wiring and revert API response shape; JSON package unused is harmless.

## Open Questions

- Import popover: open preview on every tap vs direct import-all shortcut — default preview everywhere unless operator wants one-tap import in popover only.
- Whether to show a secondary locale section when UI is `en` but user may want `vi`-only lists later (when catalogs diverge).
- Optional `titleOverrides` in JSON for marketing names if YouTube titles are poor.
