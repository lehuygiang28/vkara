## ADDED Requirements

### Requirement: Redis cache for embed playability

The API MUST store embed playability results in Redis under keys `youtube-embed:{videoId}` with values `1` (embeddable) or `0` (not embeddable). Each key MUST have a TTL configured by `VKARA_EMBED_CACHE_TTL_SECONDS` (default 2592000 seconds / 30 days). The system MUST NOT maintain a separate in-process Map cache for embed results (in-flight request deduplication per process is permitted).

#### Scenario: Cache hit on repeated check

- **WHEN** `resolveEmbeddabilityMany` is called for a video id that has a non-expired Redis key
- **THEN** the system MUST NOT fetch YouTube embed HTML for that id
- **AND** it MUST return the cached boolean value

#### Scenario: Cache miss populates Redis

- **WHEN** `resolveEmbeddabilityMany` is called for a video id with no Redis key
- **THEN** the system MUST fetch embed HTML using the existing playability rules
- **AND** MUST write `1` or `0` to Redis with the configured TTL

#### Scenario: Batch read uses MGET

- **WHEN** multiple video ids are resolved in one call
- **THEN** the system MUST read Redis using a single MGET (or equivalent batch) for all keys before issuing embed fetches for misses

### Requirement: Shared embed resolver

All server-side embed eligibility checks MUST go through `resolveEmbeddabilityMany(redisClient, videoIds)` (and `checkEmbeddable` MUST delegate to it). This includes WebSocket room handlers, `POST /check-embeddable`, playlist import filtering, and optional list prefilter paths.

#### Scenario: WebSocket add video uses resolver

- **WHEN** a client sends `addVideo` for a video id
- **THEN** the server MUST consult the shared resolver before mutating the room queue
- **AND** MUST reject with `VIDEO_NOT_EMBEDDABLE` when the resolver returns false

#### Scenario: Check embeddable HTTP endpoint

- **WHEN** a client calls `POST /check-embeddable` with a list of video ids
- **THEN** the response MUST be produced by the shared resolver for those ids

### Requirement: List prefilter feature flag

List-time embed filtering MUST be controlled by `VKARA_EMBED_PREFILTER_AT_LIST`. When the variable is unset or not enabled (boolean flag format: `true` / `false` / `1` / `0` / `yes` / `no` / `on` / `off`), list endpoints MUST NOT filter search/related/playlist preview results by embeddability. When truthy, those endpoints MUST omit videos the resolver marks as not embeddable.

#### Scenario: Flag off preserves current list behavior

- **WHEN** `VKARA_EMBED_PREFILTER_AT_LIST` is not enabled
- **AND** a client calls `POST /search` or `POST /related`
- **THEN** the returned `items` MUST NOT be filtered by embed playability (same as pre-change behavior)
- **AND** WebSocket add/play MAY still perform embed checks

#### Scenario: Flag on filters search results

- **WHEN** `VKARA_EMBED_PREFILTER_AT_LIST` is enabled
- **AND** a client calls `POST /search` or `POST /related`
- **THEN** every item in `items` MUST be embeddable according to the resolver
- **AND** non-embeddable videos MUST NOT appear in the response

### Requirement: Room mutation guard with prefilter enabled

When `VKARA_EMBED_PREFILTER_AT_LIST` is enabled, the server MUST still verify embed playability on WebSocket `addVideo`, `playNow`, `addVideoAndMoveToTop`, and when advancing the queue to the next playable video, before applying room state changes.

#### Scenario: Add after list still guarded

- **WHEN** prefilter is enabled and a client adds a video via WebSocket
- **THEN** the server MUST run the embed resolver for that video id before queue mutation
- **AND** MUST return `VIDEO_NOT_EMBEDDABLE` if the resolver returns false

### Requirement: Negative caching

Videos determined not embeddable MUST be cached in Redis as `0` with the same TTL as embeddable videos.

#### Scenario: Non-embeddable video cached

- **WHEN** embed HTML indicates the video cannot play in embedded players
- **THEN** Redis MUST store `0` for that video id with TTL
- **AND** subsequent resolver calls MUST return false without refetching until TTL expiry
