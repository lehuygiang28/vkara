## ADDED Requirements

### Requirement: Shared Redis cache plumbing package

The monorepo MUST provide `@vkara/cache-redis` with reusable helpers for boolean (`1`/`0`) and JSON value caches on Redis, including batch `MGET` and pipelined `SETEX` writes.

#### Scenario: Boolean cache batch read

- **WHEN** multiple keys are requested from a boolean cache helper
- **THEN** the helper MUST use a single `MGET` (or equivalent) for all keys

#### Scenario: Redis error fail-open

- **WHEN** Redis throws during a cache read or write
- **THEN** the helper MUST NOT throw to callers
- **AND** read paths MUST treat failures as cache miss (undefined)
- **AND** write paths MUST allow fetch-through to continue (matching current embed cache behavior)

### Requirement: Domain modules own key policy

YouTube cache modules MUST continue to own key prefixes, TTL constants, and response validation logic. `@vkara/cache-redis` MUST NOT hard-code `youtube-embed:` or playlist key shapes.

#### Scenario: Embed cache key unchanged

- **WHEN** embed playability is cached after migration
- **THEN** keys MUST remain `youtube-embed:{videoId}` with values `1` or `0`
- **AND** TTL MUST still come from `VKARA_EMBED_CACHE_TTL_SECONDS` with the same default (2592000 seconds)

#### Scenario: Playlist details cache key unchanged

- **WHEN** playlist details are cached after migration
- **THEN** keys MUST remain `youtube-playlist-details:{listId}:{scope}` with TTL 3600 seconds

#### Scenario: Channel cache key unchanged

- **WHEN** channel metadata is cached after migration
- **THEN** keys MUST remain `youtube-channel:{channelId}` with TTL 86400 seconds

### Requirement: In-memory youtube continuation cache excluded

Process-local `Map` caches for search/related continuations in `apps/api/src/modules/youtube/cache.ts` MUST NOT move into `@vkara/cache-redis` in this change.

#### Scenario: Search continuation stays in-process

- **WHEN** search pagination uses continuation tokens
- **THEN** the in-memory `searchInstances` / `relatedInstances` maps MUST remain in the API youtube module
