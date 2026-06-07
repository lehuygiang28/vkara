## Why

vkara is YouTube-only today. A working TikTok prototype (`tiktok/` — search via Playwright, playback via Embed Player `player/v1` + `postMessage`) proves an alternate karaoke source is viable, but it must not ship as a default product path. We need a gated **Experiments** surface in Settings so users can opt in and switch between YouTube and TikTok without destabilizing the main experience.

## What Changes

- Add deploy-time gate `VKARA_EXPERIMENTS` (and web mirror) to expose the Experiments section and TikTok API routes.
- Add **Settings → Experiments** with a persisted `videoProvider` toggle (`youtube` | `tiktok`), defaulting to YouTube.
- Promote TikTok prototype into monorepo: `packages/tiktok` types/utils + `apps/api` `POST /tiktok/search` (browser pool, server-side only).
- Add web client TikTok search service and branch `searchStore` / browse flows on active provider.
- Add `TikTokTvEmbed` using `https://www.tiktok.com/player/v1/{id}` with hidden native controls and host `postMessage` for play/pause/seek/mute.
- Map `TikTokVideo` → queue-compatible items (adapter on existing `YouTubeVideo` shape with `source: 'tiktok'` discriminator) so room WS schemas change minimally in v1.
- Skip YouTube-only embed prefilter / playlist import / captions when TikTok provider is active.
- Switching provider clears local search results; warn or block if current queue has incompatible items (device-local v1).
- **Out of scope v1**: TikTok playlists, related feed, captions, personalization ranking, oEmbed embed path.

## Capabilities

### New Capabilities

- `experiments-settings`: User-facing Experiments section in device Settings; persisted provider preference; visibility gated by `VKARA_EXPERIMENTS`.
- `tiktok-search-api`: Server-side TikTok search endpoint, browser pool lifecycle, validators, and promotion from standalone `tiktok/` prototype.
- `tiktok-embed-player`: Client TikTok iframe player (`player/v1`), postMessage control bridge, and playback-sync integration for room karaoke.
- `video-provider-routing`: Search/player/API routing between YouTube and TikTok based on experiments provider setting.

### Modified Capabilities

- `platform-feature-flags`: Add `VKARA_EXPERIMENTS` flag documentation, schema, and typed helper; scope `both`.

## Impact

- **packages/env** — new flag + helpers; `.env.example` updates.
- **packages/tiktok** (new) — types, parse/map helpers from prototype.
- **packages/validators** — TikTok HTTP schemas; optional queue item discriminator field.
- **apps/api** — `tiktok.ts` plugin, Playwright/Chromium dependency, mount behind flag; `room-service` branches embed check for TikTok items.
- **apps/web** — `appSettingsStore`, settings UI, `tiktok-api.ts`, `TikTokTvEmbed`, `tiktok-playback-sync.ts`, `searchStore` / `PlayerColumn` branches.
- **containers** — API image may need Chromium for TikTok search when experiments enabled.
- **openspec** — new capability specs above; delta on `platform-feature-flags`.
