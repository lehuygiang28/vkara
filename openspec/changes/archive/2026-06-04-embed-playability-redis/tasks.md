## 1. Redis cache module

- [x] 1.1 Add `embed-playability-cache.ts` with key prefix `youtube-embed:`, `mgetEmbeddability`, `setEmbeddabilityMany` (pipeline SETEX), and TTL from `VKARA_EMBED_CACHE_TTL_SECONDS` (default 2592000)
- [x] 1.2 Add unit tests for cache key format, MGET mapping, and SETEX TTL wiring (mock Redis)

## 2. Shared resolver

- [x] 2.1 Implement `resolveEmbeddabilityMany(redisClient, videoIds)` using MGET → miss fetch via existing `fetchEmbeddable` / `isEmbedBlockedInHtml` → pipeline write
- [x] 2.2 Refactor `checkEmbeddable` to delegate to resolver; remove in-memory `embeddableCache` Map from `embeddable.ts`
- [x] 2.3 Update `checkEmbeddableMany` and `filterEmbeddableVideos` to use resolver only (delete duplicate batch paths)
- [x] 2.4 Add `isEmbedPrefilterAtListEnabled()` helper reading `VKARA_EMBED_PREFILTER_AT_LIST`
- [x] 2.5 Update `apps/api/tests/modules/youtube/embeddable.test.ts` and add resolver/cache tests with Redis mock

## 3. Wire call sites

- [x] 3.1 Pass `redisClient` into embed checks in `room-service.ts` (`addVideo`, `playNow`, `addVideoAndMoveToTop`, `resolveNextEmbeddableFromQueue` path)
- [x] 3.2 Update `prepare-youtube-videos.ts`: when prefilter flag on, resolve batch on mapped ids and filter items; update module comment
- [x] 3.3 Update `youtubei.ts` `/search` and `/related` to pass redis into prepare path (if not already threaded)
- [x] 3.4 Update `fetchYoutubePlaylistDetailsCached` (and uncached return path) to filter `videos` on serve when prefilter flag on
- [x] 3.5 Update `POST /check-embeddable` in `youtubei.ts` to use resolver with app redis client

## 4. Documentation and rollout

- [x] 4.1 Document `VKARA_EMBED_PREFILTER_AT_LIST` and `VKARA_EMBED_CACHE_TTL_SECONDS` in API README or env example (default flag off)
- [x] 4.2 Run `bun test` for api youtube/embed modules; smoke manual search with flag off (no regression) and flag on (non-embeddable items absent)

## 5. Archive readiness

- [x] 5.1 Verify OpenSpec delta specs match implementation behavior before archive

## 6. Sing King regression tests

- [x] 6.1 Fixture `tests/fixtures/sing-king-search.ts` for Sing King–style search rows
- [x] 6.2 `sing-king-embed-prefilter.test.ts` — empty page when all cached `0`, partial keep, flag off passthrough
- [x] 6.3 `resolve-embeddable-queue.test.ts` — MAX_EMBED_SKIP caps checks per advance
