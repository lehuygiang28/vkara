## 1. WebSocket render isolation

- [x] 1.1 Stop including `lastMessage` in `WebSocketProvider` context value / `useMemo` deps; keep lifecycle handling via store subscription or a childless effect bridge
- [x] 1.2 Migrate `apps/web/src/components/pages/youtube/index.tsx` off `useWebSocket().lastMessage` to `useWebSocketStore.subscribe` (mirror `TvPage`)
- [x] 1.3 Grep and fix any remaining `useWebSocket()` consumers that depend on `lastMessage` from context
- [x] 1.4 Confirm TV recovery / rejoin / roomClosed / kicked paths still fire after the split

## 2. Persist and embed stability

- [x] 2.1 Narrow `youtubeStore` `partialize` to cold session fields (room id + layout prefs); exclude hot room payload / `currentTime`
- [x] 2.2 Verify `merge` + TV reload rejoin still works with `roomRejoinSecretStore`
- [x] 2.3 Stabilize `TvPlayerHost` → `PlayerEmbedSurfaceMemo` props so unchanged `playingNow.id` does not reload the embed on `roomUpdate`
- [x] 2.4 Add or update unit tests for persist partialize / merge and any TV recovery coverage touched

## 3. TV paint and motion (tokens + components)

- [x] 3.1 Replace `backdrop-filter` on `.tv-settings-rail` and `.tv-next-up-overlay__scrim` with opaque/high-opacity gradients
- [x] 3.2 Remove QR `filter: drop-shadow` and countdown progress drop-shadow; use static plate/border treatment
- [x] 3.3 Simplify `.tv-player-scrim` to fewer gradient stops (or bottom-weighted fade)
- [x] 3.4 Freeze fixed corner QR canvas size; optional expand via CSS `transform` only (no pixel size swap)
- [x] 3.5 Rewrite queue shelf peek/expand off `max-height` / thumb `height` / `aspect-ratio` animation to `transform`/`opacity` or instant
- [x] 3.6 Update `TvPlaybackProgress` to `scaleX` / `translateX` (drop width/`left` layout animation and thumb glow)
- [x] 3.7 Cheapen TV focus halos (`tv-focus-styles` / focused token shadows) to border/outline-first rings
- [x] 3.8 Set TV queue track scroll to `behavior: 'auto'` (JS + CSS)

## 4. Verification

- [ ] 4.1 Manual QA on `/tv`: idle playback 2 min, D-pad reveal/hide, queue expand/focus, settings, next-up, phone remote play/pause
- [ ] 4.2 Manual QA: reload `/tv` and confirm rejoin; abandon/recovery path smoke
- [x] 4.3 Run affected web unit tests / lint for touched files
