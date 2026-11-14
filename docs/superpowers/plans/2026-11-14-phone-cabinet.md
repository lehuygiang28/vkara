# Phone cabinet and watch_videos import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save songs on the phone and send them into the room, and accept a YouTube `watch_videos?video_ids=` URL in playlist import.

**Architecture:** A pure cabinet list in the phone's `vkara-cabinet` localStorage, a remote **Bài tủ** tab, and one `addVideos` room command. Import resolves a `watch_videos` URL with a short redirect follow, then the existing playlist fetch.

**Tech Stack:** TypeScript, Zustand persist, Zod websocket messages, Vitest, YouTube InnerTube playlist fetch already in `apps/api`.

## Global Constraints

- No login and no cabinet stored on the room or on `/tv`.
- Cabinet key is `vkara-cabinet`. Shape is `{ videos: YouTubeVideo[] }` with index 0 as the newest save, unique ids, maximum 200.
- A second save of the same id removes it. It does not move the row.
- Add-all sends the stored videos. It does not call `watch_videos`.
- A `watch_videos` URL with any invalid id is rejected. More than 50 valid ids keeps the first 50.
- Copy is in `apps/web/src/locales/en.ts` and `apps/web/src/locales/vi.ts`.

---

### Task 1: Cabinet list

**Files:**
- Create: `apps/web/src/lib/cabinet.ts`
- Modify: `apps/web/src/lib/persisted-storage.ts`
- Test: `apps/web/tests/lib/cabinet.test.ts`

**Interfaces:**
- Consumes: `YouTubeVideo` from `@vkara/youtube`. `normalizePersistedYouTubeVideo` exported from `persisted-storage.ts`.
- Produces: `CABINET_VIDEO_LIMIT = 200`, `toggleCabinetVideo(videos, video)`, `parseCabinetVideos(raw)`.

- [x] **Step 1: Write the failing test**

Cover add-to-front, remove on second toggle, drop past 200, and parse that skips a bad entry and a duplicate id.

- [x] **Step 2: Run the test and confirm it fails**

Run: `bunx vitest run --config vitest.config.mts apps/web/tests/lib/cabinet.test.ts`

- [x] **Step 3: Implement the two functions and export the normalizer**

- [x] **Step 4: Re-run the test and confirm it passes**

### Task 2: Phone cabinet store

**Files:**
- Create: `apps/web/src/store/cabinetStore.ts`
- Test: `apps/web/tests/store/cabinet-store.test.ts`

**Interfaces:**
- Consumes: `toggleCabinetVideo`, `parseCabinetVideos`, `createMigratingPersistStorage`.
- Produces: `useCabinetStore` with `videos`, `toggle(video)`, `clear()`. Persist name `vkara-cabinet`. Hydration runs `parseCabinetVideos`.

- [x] **Step 1: Test toggle, clear, and a corrupt persisted blob that hydrates as an empty list or a cleaned list**

- [x] **Step 2: Implement the store**

- [x] **Step 3: Run `apps/web/tests/store/cabinet-store.test.ts`**

### Task 3: addVideos room command

**Files:**
- Modify: `packages/validators/src/ws/client-message.ts`
- Modify: `apps/api/src/modules/room/room-commands.ts`
- Modify: `apps/api/src/modules/room/room-service.ts`
- Modify: `apps/web/src/hooks/use-player-action.ts`
- Test: `apps/api/tests/modules/room/room-commands.test.ts`
- Test: `apps/api/tests/schemas/client-message.test.ts`

**Interfaces:**
- Consumes: `youtubeVideoSchema`, `filterYouTubeVideosByEmbeddability`, `isTikTokVideo`, `isVideoAlreadyInRoom`.
- Produces: client message `{ type: 'addVideos', videos: YouTubeVideo[] }` with length 1 to 200. `addVideosToRoom(roomId, videos)`.

- [x] **Step 1: Schema test accepts one video and rejects an empty array**

- [x] **Step 2: Command tests**

Empty room starts the first video and queues the rest. A playing room appends and skips the current id. A filter that drops every YouTube video throws `videoNotFound`. A batch of ids already in the room throws `alreadyInQueue`.

- [x] **Step 3: Implement the command and the `addVideos` switch arm**

TikTok videos stay. YouTube videos go through `filterYouTubeVideosByEmbeddability`. Order follows the input. Nothing playing and an empty queue starts the first kept video.

- [x] **Step 4: Run the room-command and schema tests**

### Task 4: Remote cabinet UI

**Files:**
- Create: `apps/web/src/components/pages/youtube/VideoCabinet.tsx`
- Create: `apps/web/src/components/pages/youtube/use-cabinet-save-action.ts`
- Modify: `apps/web/src/components/pages/youtube/RemoteShell.tsx`
- Modify: `apps/web/src/components/pages/youtube/MobileBottomNav.tsx`
- Modify: `apps/web/src/components/pages/youtube/VideoListItem.tsx`
- Modify: `apps/web/src/components/pages/youtube/use-video-search-list-actions.tsx`
- Modify: `apps/web/src/components/pages/youtube/VideoQueue.tsx`
- Modify: `apps/web/src/components/pages/youtube/VideoHistory.tsx`
- Modify: `apps/web/src/hooks/use-player-action.ts`
- Modify: `apps/web/src/locales/en.ts`
- Modify: `apps/web/src/locales/vi.ts`

**Interfaces:**
- Consumes: `useCabinetStore`, `addVideos` via `handleAddVideos`.
- Produces: More-menu tab `cabinet`. Save action id `cabinet` on search, browse, curated preview, queue, history, and the cabinet. Star beside a saved title.

- [x] **Step 1: Add the locale keys in both files**

`youtubePage.cabinet`, `videoCabinet.*`, `toast.addVideosHandler`.

- [x] **Step 2: Wire the tab, the save action, the marker, and add-all**

`/tv` files stay unchanged.

- [x] **Step 3: Run `bunx vitest run --config vitest.config.mts apps/web/tests/store/cabinet-store.test.ts apps/web/tests/lib/cabinet.test.ts`**

### Task 5: watch_videos import

**Files:**
- Create: `packages/youtube/src/youtube-watch-videos.ts`
- Modify: `packages/youtube/src/index.ts`
- Create: `packages/youtube/tests/youtube-watch-videos.test.ts`
- Modify: `packages/youtube/tests/youtube-playlist-url.test.ts`
- Create: `apps/api/src/modules/youtube/resolve-watch-videos-url.ts`
- Modify: `apps/api/src/modules/youtube/fetch-playlist-details-cached.ts`
- Modify: `apps/api/src/modules/youtube/fetch-playlist-details.ts`
- Modify: `apps/api/src/modules/youtube/fetch-playlist-videos.ts`
- Modify: `apps/web/src/components/curated-playlists/import-playlist-panel.tsx`
- Test: `apps/api/tests/modules/youtube/resolve-watch-videos-url.test.ts`

**Interfaces:**
- Consumes: `isValidYoutubeVideoId`, `youtubeOutboundFetch`.
- Produces: `parseWatchVideosUrl(raw)` returning `{ kind: 'absent' | 'invalid' | 'ok', videoIds?: string[] }`. `coercePlaylistFetchInput(raw)` returns a playlist URL or throws `Error('Invalid playlist URL')`.

- [x] **Step 1: Parser tests**

Accept the sample three-id URL and keep the order. Reject a space, a short token, and an empty `video_ids`. Keep the first 50 of 60 valid ids. Return `absent` for a normal playlist URL. Accept `list=TLGGph6XLhEqeG8xNDExMjAyNg` in `parseYoutubePlaylistInput` as `isMix: false`.

- [x] **Step 2: Redirect test**

A fake fetch returns 303 to `https://www.youtube.com/watch?v=Cfa2FTJG7CQ&list=TLGGph6XLhEqeG8xNDExMjAyNg`. `coercePlaylistFetchInput` returns that URL. A 303 with no `list` throws.

- [x] **Step 3: Call `coercePlaylistFetchInput` before `parseYoutubePlaylistInput` in the three playlist fetch entry points**

Pass the coerced URL downward so a `watch_videos` URL is resolved once per import.

- [x] **Step 4: Import panel**

`kind: 'ok'` submits the original URL. `kind: 'invalid'` shows the existing invalid-URL error. `kind: 'absent'` keeps `parseYoutubePlaylistInput`.

- [x] **Step 5: Run the youtube package tests and the new API test**

Run: `bunx vitest run --config vitest.config.mts packages/youtube/tests/youtube-watch-videos.test.ts packages/youtube/tests/youtube-playlist-url.test.ts apps/api/tests/modules/youtube/resolve-watch-videos-url.test.ts`
