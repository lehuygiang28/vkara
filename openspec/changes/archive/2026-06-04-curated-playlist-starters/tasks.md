## 1. Catalog package

- [x] 1.1 Create `packages/curated-playlists` with `playlists.json` (version 1, `karaoke` catalog with four operator list URLs, empty `music` catalog optional)
- [x] 1.2 Add Zod or type guards and helpers: parse playlist URL to list id, `loadCatalogs()`, `filterCatalogsByLocale(locale)`
- [x] 1.3 Add unit tests for locale filter, ordering, empty catalog omission, invalid URL handling
- [x] 1.4 Wire package into monorepo (`package.json`, tsconfig references, web/api imports as needed)

## 2. Shared types

- [x] 2.1 Add `PlaylistDetailsResponse` (playlist metadata + `YouTubeVideo[]`) in `packages/shared-types`
- [x] 2.2 Export types from package index and use in API + web client

## 3. API playlist details

- [x] 3.1 Refactor `fetchYoutubePlaylistVideos` (or add `fetchYoutubePlaylistDetails`) to return playlist metadata from youtubei `Playlist`
- [x] 3.2 Update `POST /playlist` in `apps/api/src/youtubei.ts` to return `{ playlist, videos }` with optional `videoLimit`
- [x] 3.3 Add API tests for valid list id, error cases, and video limit behavior
- [x] 3.4 Confirm `importPlaylist` room handler unchanged (no WS schema changes)

## 4. Web API client and cache

- [x] 4.1 Add `fetchPlaylistDetails(listId, options?)` to `apps/web/src/services/youtube-api.ts`
- [x] 4.2 Add session cache hook (e.g. `usePlaylistDetailsCache`) keyed by list id
- [x] 4.3 Add metadata prefetch helper for visible curated cards (lazy/staggered)

## 5. Curated UI components

- [x] 5.1 Implement `CuratedPlaylistCard` (skeleton, title, thumb, video count, min touch target)
- [x] 5.2 Implement `CuratedCatalogSection` (catalog heading from i18n, horizontal scroll or grid of cards)
- [x] 5.3 Implement `CuratedPlaylistPreviewOverlay` with `VideoList` and existing search list actions
- [x] 5.4 Wire import-all to `handleImportPlaylist` + `setCurrentTab('queue')`; per-song to `addVideo` without tab switch

## 6. Surface integration

- [x] 6.1 Browse idle: integrate curated sections in `BrowseSuggestionsList` / `VideoSearch` when idle and `showCuratedStarter`
- [x] 6.2 Queue empty: integrate curated sections in `VideoQueue` empty state
- [x] 6.3 Import popover: list curated playlists in import menu
- [x] 6.4 Session state: `curatedPreviewOpen`, `curatedDismissed`; freeze browse feed swap while preview open
- [x] 6.5 Hide curated on browse when search results active; dismiss curated on search CTA

## 7. i18n

- [x] 7.1 Add `curatedPlaylists.*` keys to `apps/web/src/locales/en.ts` and `vi.ts` (catalog labels, add all, close, errors, loading)

## 8. Verification

- [x] 8.1 Manual test: cold browse shows karaoke starters; preview lists songs; add one song stays on preview/tab; import all goes to queue tab
- [x] 8.2 Manual test: queue empty and import menu show same starters
- [x] 8.3 Manual test: adding first song during preview does not swap browse to related feed underneath
- [x] 8.4 Run CI tests for new packages and API changes
