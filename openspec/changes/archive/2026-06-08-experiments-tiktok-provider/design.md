## Context

vkara's karaoke flow is built entirely around YouTube: InnerTube search (`apps/api/youtubei.ts`), `YouTubeVideo` queue items, `YoutubeTvEmbed` (YT IFrame API), and `youtube-playback-sync` for multi-device rooms. Feature toggles today are deploy-time `VKARA_*` env flags in `@vkara/env`; user Settings persist only device preferences (e.g. voice search).

A standalone TikTok prototype at repo root `tiktok/` validates:
- Search requires server-side Playwright (signed TikTok API URLs).
- Playback is viable via TikTok Embed Player (`player/v1/{id}`) and `postMessage` (`play`, `pause`, `seekTo`, `mute`, `unMute`; events `onPlayerReady`, `onCurrentTime`, `onStateChange`).

This change integrates TikTok as an **optional experimental provider**, not a parallel product.

## Goals / Non-Goals

**Goals:**

- Gate all TikTok functionality behind `VKARA_EXPERIMENTS` (deploy) and a user-visible Experiments provider toggle (Settings).
- Let users switch search and playback between YouTube (default) and TikTok on the same device.
- Reuse existing room queue / WS flow with minimal schema churn (adapter pattern).
- Ship TikTok search on API with reused browser pool from prototype (~2.5s/search benchmark).
- Ship TikTok player with custom vkara controls via `player/v1` + hidden native UI.

**Non-Goals:**

- Room-level provider lock or cross-client provider negotiation (v1 is device-local; document limitations).
- TikTok playlist import, related/browse feed, captions, personalization ranking.
- oEmbed embed path (no programmatic control).
- Direct MP4 `playUrl` playback (signed URLs expire; use iframe).
- Production-default TikTok (always off unless `VKARA_EXPERIMENTS` set).

## Decisions

### 1. Two-layer gating: env + Settings

**Choice:** `VKARA_EXPERIMENTS` (scope `both`) controls API routes + visibility of Settings section; `videoProvider` in `useAppSettingsStore` controls runtime routing.

**Alternatives:**
- Settings-only — rejected: would expose Playwright search in production without ops control.
- Env-only — rejected: user cannot opt in/out without redeploy.

**Rationale:** Matches existing `FLAG_DOCS` pattern and user request ("chỉ enable bằng settings" within an experiments surface).

### 2. Adapter on `YouTubeVideo` shape (v1)

**Choice:** Add optional `source?: 'youtube' | 'tiktok'` (default `'youtube'`). Map `TikTokVideo` → compatible fields: `id`, `title`←`desc`, `duration`, `url`, `thumbnails` from `cover`, `channels[0]` from `author`.

**Alternatives:**
- New `MediaVideo` discriminated union across Room/WS — correct long-term, too large for experiment v1.

**Rationale:** `VideoList`, `usePlayerAction`, WS `playNow`/`addVideo` stay typed; branch on `source` in player layer only.

### 3. TikTok search lives in `apps/api`, Playwright server-side

**Choice:** Promote `tiktok/browser-pool.ts`, `search.ts`, `shared.ts` into `packages/tiktok` + `apps/api/src/tiktok.ts` plugin exposing `POST /tiktok/search`. Mount only when `isExperimentsEnabled()`.

**Alternatives:**
- Client-side search — impossible (needs signed URLs in browser context).
- Separate worker service — defer until API memory/CPU is proven insufficient.

**Rationale:** Prototype already works; monorepo integration is the smallest path.

### 4. Player: `player/v1` iframe, not oEmbed

**Choice:** `TikTokTvEmbed` component loads `https://www.tiktok.com/player/v1/{id}?controls=0&progress_bar=0&play_button=0&volume_control=0&...`. Host sends `postMessage` commands; listens for `onCurrentTime` / `onStateChange` for sync.

**Alternatives:**
- oEmbed + `embed.js` — no seek/volume API from host.
- HTML5 `<video src=playUrl>` — URLs expire; CORS issues.

**Rationale:** Confirmed in `tiktok/player-demo.html`; aligns with [TikTok Embed Player docs](https://developers.tiktok.com/doc/embed-player).

### 5. Provider switch behavior (device-local v1)

**Choice:** Changing `videoProvider` clears `searchStore` results. If `playingNow` exists with mismatched `source`, show confirm dialog then `playNow` nothing / clear local preview; WS queue items from other source remain but next play from search uses new provider.

**Alternatives:**
- Room-level provider — better for multi-user; deferred.

**Rationale:** Avoids blocking experiment ship on Room schema changes.

### 6. Skip YouTube embed prefilter for TikTok items

**Choice:** `room-service` / `checkEmbeddable` no-op when `video.source === 'tiktok'`. List prefilter unchanged for YouTube paths.

**Rationale:** TikTok iframe playability is orthogonal to YouTube embed checks.

### 7. Playback sync: parallel module

**Choice:** New `tiktok-playback-sync.ts` mirroring `youtube-playback-sync.ts` interface where possible; `PlayerColumn` delegates by `source`.

**Limitation:** TikTok supports `mute`/`unMute` only — no `setVolume(0.7)`. Room volume slider may map to mute threshold or no-op for TikTok with UI hint.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Playwright RAM/CPU on API | Reuse singleton browser pool; lazy init on first TikTok search; document container sizing |
| Cold start ~2s+ per search | Acceptable for experiment; optional warmup on API boot behind flag |
| Mixed queue (YT + TT items) | `source` discriminator; player branches; v2 room-level provider |
| Multi-device room desync if users pick different providers | Document as experiment limitation; v2 broadcast provider in Room |
| TikTok postMessage API changes | Isolate in `TikTokTvEmbed` + sync module; integration test against known video ID |
| Chromium in Docker image | Add Playwright install to API container when experiments enabled |

## Migration Plan

1. Land `@vkara/env` flag + web `NEXT_PUBLIC_VKARA_EXPERIMENTS` without UI (no user impact).
2. Add API `/tiktok/search` behind flag; verify with curl/CLI.
3. Add Settings Experiments UI + client routing (flag off = hidden).
4. Add `TikTokTvEmbed` + sync; enable in dev with `VKARA_EXPERIMENTS=1`.
5. Update `.env.example`, container docs for Chromium.

**Rollback:** Unset `VKARA_EXPERIMENTS` — TikTok routes unmounted, Settings section hidden, users fall back to YouTube default.

## Open Questions

- Should API container always bundle Chromium, or only in an experiments Docker profile?
- Confirm dialog copy when switching provider mid-playback (vi/en i18n keys).
- Whether browse feed (`use-browse-feed`) shows empty state or hides entirely for TikTok v1.
