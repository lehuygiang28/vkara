## Why

Users often pick videos from search or playlist preview that cannot be embedded on vkara, only discovering the failure after add/play (toast `videoNotEmbeddable`). That wastes clicks and erodes trust in karaoke discovery. Embed eligibility is stable for most videos and is already checked on the server at queue mutation time, but results are only cached in process memory (not shared across API instances, short TTL). Centralizing playability in Redis with optional list-time filtering removes dead-end interactions while keeping a feature flag to preserve today's lazy-only UX during rollout.

## What Changes

- Introduce a **Redis-first** embed playability cache (`youtube-embed:{videoId}` → `0`/`1`, default TTL ~30 days) with **MGET** batch reads and pipelined **SETEX** writes; remove the in-memory `Map` cache in `embeddable.ts`.
- Add **`resolveEmbeddabilityMany(redis, videoIds)`** as the single code path used by search/related preparation, WebSocket add/play/advance, playlist import filter, `/check-embeddable`, and playlist preview serve path.
- Add feature flag **`VKARA_EMBED_PREFILTER_AT_LIST`** (default `false`): when `true`, filter non-embeddable videos from `/search`, `/related`, and playlist preview responses; when `false`, HTTP list behavior matches today (no embed prefilter on list endpoints).
- Keep **WebSocket embed guard** on `addVideo`, `playNow`, `addVideoAndMoveToTop`, and `advanceToNext` even when prefilter is enabled (authority on room mutation).
- Apply embed filter **on read** for cached playlist details (do not bake filtered lists into `youtube-playlist-details` Redis blobs).
- Consolidate duplicate batch logic (`filterEmbeddableVideos`, `checkEmbeddableMany`) onto the shared resolver.
- Retain embed HTML fetch, domain rotation, in-flight dedupe per process, and concurrency cap (not a second cache layer).

## Capabilities

### New Capabilities

- `youtube-embed-playability`: Redis cache contract, batch resolve API, feature flag for list prefilter, integration points, and WS fallback semantics.

### Modified Capabilities

- `youtube-playlist-details`: When `VKARA_EMBED_PREFILTER_AT_LIST` is enabled, playlist preview video lists MUST exclude non-embeddable entries after cache hit (filter on serve, not on cache write).

## Impact

- **API**: `apps/api/src/modules/youtube/embeddable.ts` (refactor), new `embed-playability-cache.ts` (or equivalent), `prepare-youtube-videos.ts`, `youtubei.ts` (`/search`, `/related`), `resolve-embeddable-queue.ts`, `room-service.ts`, `fetch-playlist-details-cached.ts` / playlist preview path.
- **Shared types**: Optional response metadata later; MVP filters items server-side without breaking `YouTubeVideo` shape.
- **Web**: No required changes for MVP if server filters items; fewer `VIDEO_NOT_EMBEDDABLE` toasts when flag is on.
- **Redis**: New key prefix `youtube-embed:`; memory bounded by TTL and unique video ids checked.
- **Env**: `VKARA_EMBED_PREFILTER_AT_LIST`, `VKARA_EMBED_CACHE_TTL_SECONDS` (default 30 days); shared flag parser in `apps/api/src/config/env.ts`.
- **Tests**: Cache module unit tests, resolver batch/MGET tests, prefilter flag on/off for search and playlist preview, existing `embeddable.test.ts` updated for Redis injection/mocks.
