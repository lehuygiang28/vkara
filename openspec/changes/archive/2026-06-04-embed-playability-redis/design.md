## Context

Today embed playability is determined by fetching YouTube embed iframe HTML and parsing `previewPlayabilityStatus` / blocked-message patterns (`apps/api/src/modules/youtube/embeddable.ts`). Results are cached in a **process-local `Map`** (1 hour TTL). `prepareYoutubeVideos` explicitly skips embed checks for `/search` and `/related`; users hit `checkEmbeddable` only on WebSocket `addVideo` / `playNow` / etc., or during `importPlaylist` via `filterEmbeddableVideos`. The API already exposes `POST /check-embeddable` but the web client does not use it after search.

Redis is already used for channel cache (`youtube-channel:{id}`), search continuations, room state, and playlist details blobs (`youtube-playlist-details:{listId}:...` with 1h TTL). Multiple API instances make a shared embed cache necessary for speed and consistency.

## Goals / Non-Goals

**Goals:**

- Reduce useless add/play attempts by optionally **filtering non-embeddable videos** from list endpoints when `VKARA_EMBED_PREFILTER_AT_LIST=true`.
- **Redis as the only persistence cache** for embed results (no in-memory Map); optimize with **MGET** + **pipeline SETEX**.
- Default Redis TTL **30 days** (`VKARA_EMBED_CACHE_TTL_SECONDS`, overridable).
- **Feature flag** default off so list endpoints behave as today until operators enable prefilter.
- **Single resolver** for all call sites; keep WS guard on room mutations.
- **Negative caching** (`0` and `1` both stored with TTL).

**Non-Goals:**

- Changing YouTube embed fetch logic, domain rotation, or HTML parsing rules.
- Client-side embed prefilter or new `canEmbed` field on `YouTubeVideo` in MVP (server-side filter only).
- Invalidating embed cache when a video owner toggles embedding (accepted trade-off with long TTL; WS guard covers mutations).
- Replacing playlist details blob cache TTL (stays 1h); embed filter applies after blob read.
- Removing `POST /check-embeddable` (keep; wire through resolver).

## Decisions

### 1. Redis key shape: per-video STRING, not a global Hash

**Choice:** `youtube-embed:{videoId}` → `"1"` | `"0"` with `SETEX`.

**Alternatives:** Single Redis Hash for all videos — rejected because per-field TTL is awkward, `HGETALL` does not scale, and eviction is unclear.

**Rationale:** Matches `channel-cache.ts` pattern; `MGET` gives one round-trip for a search page (~20 ids); values are minimal (no JSON parse).

### 2. Remove in-memory Map; keep in-flight dedupe only

**Choice:** Delete `embeddableCache` Map. Use `createInFlightDedup` so concurrent misses for the same `videoId` in one process share one fetch before Redis write.

**Alternatives:** L1 Map + L2 Redis — rejected per product direction (avoid double cache, main path is Redis).

**Rationale:** Cross-instance consistency; after warm-up, hot karaoke queries hit Redis in ~1–3ms via `MGET`.

### 3. Batch read/write path

**Choice:**

```text
resolveEmbeddabilityMany(redis, ids):
  uniqueIds → MGET keys
  misses → mapWithConcurrency(EMBED_CHECK_CONCURRENCY, fetchEmbeddable)
  misses → pipeline SETEX
  return Map<id, boolean>
```

`checkEmbeddable(redis, id)` delegates to `resolveEmbeddabilityMany(redis, [id])`.

### 4. Feature flag: list prefilter only

**Choice:** `VKARA_EMBED_PREFILTER_AT_LIST` — parsed via shared `parseEnvFlag` (`true` / `false` / `1` / `0` / `yes` / `no` / `on` / `off`). **Default: unset / false.**

When **false** (current product behavior):

- `/search`, `/related`: no embed resolution for filtering (no added latency).
- Playlist preview: return all videos from cached/fresh playlist details (unchanged).
- WS: still runs embed check on add/play/advance/import (uses Redis cache after first check).

When **true**:

- After `prepareYoutubeVideos`, call resolver and **drop** videos where `canEmbed === false`.
- Playlist preview: after `getCachedPlaylistDetails` or fresh fetch, filter `videos` array before response.
- `importPlaylist` / `filterEmbeddableVideos`: use same resolver (no duplicate fetch logic).

**Alternatives:** Master flag disabling Redis entirely — not required; prefilter off + Redis still improves WS repeat checks.

### 5. Hook points

| Call site | Behavior |
|-----------|----------|
| `prepareYoutubeVideos` | If prefilter on: `resolveEmbeddabilityMany` on mapped ids → `filter` |
| `youtubei.ts` `/search`, `/related` | Unchanged route shape; items may be fewer when flag on |
| `fetchYoutubePlaylistDetailsCached` | On return path, if prefilter on: filter `details.videos` |
| `room-service` add/play | `checkEmbeddable(redis, id)` before `mutateRoom` |
| `resolveNextEmbeddableFromQueue` | Uses shared check (sequential queue walk unchanged) |
| `importPlaylist` | `filterEmbeddableVideos` → resolver batch |
| `POST /check-embeddable` | `resolveEmbeddabilityMany` |

### 6. TTL: 30 days default

**Choice:** `VKARA_EMBED_CACHE_TTL_SECONDS` default `2592000` (30 × 24 × 3600).

**Trade-off:** Cached `false` may hide a video that later becomes embeddable for up to TTL; cached `true` may allow list visibility until WS rejects add. WS guard remains. Product accepts rarity vs. 1h Map TTL.

### 7. Playlist details cache: filter on serve

**Choice:** Do not store embed-filtered video lists in `youtube-playlist-details:*` blobs. When prefilter on, filter in `fetchYoutubePlaylistDetailsCached` (and uncached fetch path) immediately before returning.

**Rationale:** Flag toggles and different TTLs stay independent; blob remains canonical YouTube snapshot.

### 8. Module layout

**Choice:**

- `embed-playability-cache.ts` — `getEmbedCacheKey`, `mgetEmbeddability`, `setEmbeddabilityMany`, TTL helper.
- `embeddable.ts` — HTML fetch, `isEmbedBlockedInHtml`, `fetchEmbeddable`, re-export resolver or move resolver to `resolve-embed-playability.ts`.

Pass `redis` from `@/redis` or existing `redisClient` parameter at call sites (align `prepareYoutubeVideos` which already receives `redisClient`).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Cold search page adds 2–4s when prefilter on and zero Redis hits | Flag default off; monitor p95 `/search`; warm cache via WS/import over time |
| Stale `false` hides embeddable video for 30d | WS check on add; optional future manual cache bust |
| Stale `true` in list, fail on add | Rare; keep toast; user can pick another video |
| Redis unavailable | Fail embed check safe: treat as not embeddable OR fetch without write — **decision at implement**: prefer fetch-through without cache write on Redis error, log metric |
| Empty search page after aggressive filter | Acceptable for karaoke niche; log filtered count at debug |

## Migration Plan

1. Ship Redis cache + remove Map (prefilter **off**) — WS/import benefit from shared cache, no user-visible list change.
2. Enable `VKARA_EMBED_PREFILTER_AT_LIST=true` in staging; measure latency and skip rate.
3. Enable in production when p95 acceptable.
4. Rollback: set flag `false` (instant list behavior); Redis keys harmless to leave.

## Open Questions

- None blocking MVP. Optional follow-up: expose filtered count in debug logs or admin metric; asymmetric TTL (shorter for `0`) if false-negative reports appear.
