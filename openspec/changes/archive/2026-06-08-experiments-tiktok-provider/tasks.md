## 1. Environment and flags

- [x] 1.1 Add `VKARA_EXPERIMENTS` to `FLAG_DOCS`, zod schemas in `@vkara/env`, and `isExperimentsEnabled()` helper
- [x] 1.2 Expose `NEXT_PUBLIC_VKARA_EXPERIMENTS` in `apps/web` env and document in root `.env.example`
- [x] 1.3 Gate TikTok Elysia plugin registration in `apps/api/src/server.ts` on `isExperimentsEnabled()`

## 2. TikTok package and API

- [x] 2.1 Create `packages/tiktok` with `TikTokVideo` type, `parseVideos`, and `toQueueVideo()` adapter (`source: 'tiktok'`)
- [x] 2.2 Promote browser pool + search logic from `tiktok/` prototype into `packages/tiktok` / `apps/api` modules
- [x] 2.3 Add Zod schemas in `packages/validators/src/tiktok/http.ts` for `POST /tiktok/search`
- [x] 2.4 Implement `apps/api/src/tiktok.ts` with `POST /tiktok/search` returning adapted queue-compatible items
- [x] 2.5 Add Playwright/Chromium to API workspace dependencies and container notes when experiments enabled
- [x] 2.6 Verify search manually: `POST /tiktok/search` with `VKARA_EXPERIMENTS=1`

## 3. Experiments Settings (web)

- [x] 3.1 Extend `useAppSettingsStore` with `videoProvider: 'youtube' | 'tiktok'`, persist + migration version bump
- [x] 3.2 Add Experiments section to `device-settings-section.tsx` (warning label + provider toggle), hidden unless `NEXT_PUBLIC_VKARA_EXPERIMENTS`
- [x] 3.3 On provider change: clear `searchStore` results; confirm dialog if `playingNow` is active
- [x] 3.4 Force `videoProvider` to `youtube` when experiments flag is off (ignore stale localStorage)

## 4. Provider routing (web services + search)

- [x] 4.1 Add `apps/web/src/services/tiktok-api.ts` with `searchTikTok(query)`
- [x] 4.2 Branch `searchStore.performSearch` (and karaoke prefix) on `videoProvider`
- [x] 4.3 Update `VideoListItem` thumbnail/title rendering for TikTok adapter fields
- [x] 4.4 Hide/disable YouTube playlist import and browse-only YouTube flows when `videoProvider` is `tiktok`

## 5. TikTok player and playback sync

- [x] 5.1 Create `TikTokTvEmbed` component (`player/v1` iframe, hidden native controls)
- [x] 5.2 Implement `tiktok-playback-sync.ts` (postMessage play/pause/seekTo/mute/unMute + event listeners)
- [x] 5.3 Branch `PlayerColumn` on `playingNow.source` to mount YouTube vs TikTok embed
- [x] 5.4 Wire remote controls / `usePlayerAction` seek and play-pause for TikTok path
- [x] 5.5 Document volume limitation (mute only) in UI or disable volume slider for TikTok items

## 6. Room service and WS

- [x] 6.1 Add optional `source` field to queue item schema (validators) defaulting to `youtube`
- [x] 6.2 Skip `checkEmbeddable` in `room-service` when `source === 'tiktok'`
- [x] 6.3 Ensure `playNow` / `addVideo` WS flows accept adapted TikTok items end-to-end in a dev room

## 7. Verification and docs

- [x] 7.1 Manual test matrix: experiments off (no UI, no API), experiments on + YouTube default, experiments on + TikTok search/play/sync
- [x] 7.2 Update monorepo or container docs for Chromium requirement when `VKARA_EXPERIMENTS=1`
- [x] 7.3 Archive change after implementation passes verification
