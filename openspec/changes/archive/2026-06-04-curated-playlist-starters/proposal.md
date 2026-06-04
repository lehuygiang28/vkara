## Why

New party guests often open vkara with an empty queue and no search intent. They need fast, trustworthy starting points instead of a blank screen. Operators want to maintain a small set of pre-made YouTube playlists (grouped by catalog such as karaoke and music) without hardcoding titles in application code, while respecting UI locale for which suggestions appear first.

## What Changes

- Add a versioned JSON catalog (`packages/curated-playlists/`) with nested catalogs (`karaoke`, `music`, …), each listing YouTube playlist URLs in display order and `suggestLocales` tags (e.g. `vi`, `en`).
- Show curated playlist suggestions on three surfaces: browse idle (cold start), queue empty state, and the import-playlist menu for one-tap discovery.
- Add a playlist preview overlay so users can see all songs and add individual tracks to the queue or import the full playlist.
- Extend `POST /playlist` to return playlist metadata (title, thumbnails, video count) plus videos from YouTube, so cards and previews are not hardcoded in TypeScript.
- Locale-aware ordering: filter and prioritize catalogs/playlists whose `suggestLocales` match the current UI locale (`vi` | `en` via `useCurrentLocale()`).
- Navigation: switch to the Queue tab only after **import entire playlist**; per-song adds from preview stay on the current tab.
- Browse stability: while the curated preview overlay is open (or during a curated starter session), do not swap the browse surface to the personalized related feed when `playingNow` changes.
- Reuse existing queue flows: `importPlaylist` WebSocket for full import (append, existing server behavior); `addVideo` for single tracks. No new WebSocket message types for MVP.
- i18n for section labels and actions only; playlist titles come from YouTube metadata by default.

## Capabilities

### New Capabilities

- `curated-playlist-catalog`: JSON schema, loading, locale filtering, and catalog ordering for operator-maintained starter playlists.
- `curated-playlist-suggestions`: Remote UI for browse idle, queue empty, import menu, preview overlay, browse freeze, and queue-tab navigation rules.
- `youtube-playlist-details`: HTTP API contract returning playlist metadata plus video list for preview (and shared types for web client).

### Modified Capabilities

- _(none — no existing OpenSpec capability specs in the repository)_

## Impact

- **New package**: `packages/curated-playlists/` (JSON + validation/helpers).
- **Shared types/utils**: playlist details response types; optional URL/listId parsing helpers.
- **API**: `apps/api` — extend `POST /playlist` / `fetchYoutubePlaylistVideos` to return playlist metadata; existing `importPlaylist` room handler unchanged.
- **Web**: `apps/web` — new curated components/hooks, `youtube-api.ts` client, wiring in `BrowseSuggestionsList`, `VideoQueue`, import popover; session state for preview open / curated dismiss.
- **Locales**: `apps/web/src/locales/vi.ts`, `en.ts` — `curatedPlaylists.*` keys.
- **Tests**: catalog parsing/sort, API response shape, embed path smoke tests for configured list IDs.
