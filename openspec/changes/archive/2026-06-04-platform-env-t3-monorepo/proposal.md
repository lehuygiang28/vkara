## Why

The vkara monorepo has grown `shared-types`, `shared-utils`, and `shared-infra` packages that mix unrelated domains, duplicate infrastructure (Redis config in 3+ files), repeat cache patterns, and scatter `process.env` / feature flags across api and web. The API uses Elysia with TypeBox `t` while the target stack is **T3-turbo + zod + t3-env**, and Elysia natively supports zod via [Standard Schema / Zod OpenAPI](https://elysiajs.com/patterns/openapi.html#zod-openapi). A **single super-plan change** moves platform, domain, schemas, and imports to the end-state architecture in one coordinated effort (multiple PRs, one spec), then **deletes** deprecated `shared-*` packages.

## What Changes

### Platform (new packages)

- **`@vkara/env`** — zod + `@t3-oss/env-core` / `@t3-oss/env-nextjs`; factories `embedEnv()`, `redisEnv()`, `serverEnv()`, `webPublicEnv()`, `loggerEnv()`, `speechEnv()`; `FLAG_DOCS`; base parsers moved from api.
- **`@vkara/redis`** — rename `shared-infra`; single `createRedisOptions`; shared connection helper for ioredis + BullMQ.
- **`@vkara/cache-redis`** — bool + JSON cache helpers; migrate embed, playlist-details, channel caches.
- **`tooling/typescript`** — shared tsconfig extended by all packages/apps (T3-turbo style).

### Domain (new packages, delete shared-*)

- **`@vkara/youtube`** — types + utils from `shared-types` / `shared-utils` (youtube, captions, playlist-details).
- **`@vkara/room`** — room types, persisted-room, playback-sync, websocket message types, room utils.
- **`@vkara/personalization`** — browse-feed, rank-videos, profile, suggestions.
- **`@vkara/validators`** — **all** zod schemas for api ↔ web (WS client messages, HTTP bodies, shared DTOs).
- **`@vkara/curated-playlists`** — unchanged name; update deps to domain packages.
- **Remove** `@vkara/shared-types`, `@vkara/shared-utils`, `@vkara/shared-infra` after zero imports.

### Apps

- **`apps/api`**: `src/env.ts`; **zero** `process.env` outside env/logger bootstrap; all queues use `@vkara/redis`; migrate **`client-message.ts`**, **`youtubei.ts`**, **`room-ws.plugin.ts`** from TypeBox `t` → zod; register **`@elysiajs/openapi`** with `mapJsonSchema.zod`; remove `@sinclair/typebox` if unused.
- **`apps/web`**: `src/env.ts`; migrate **all** `process.env` reads (middleware, layout, api routes, client, SEO, speech).
- **Root `.env.example`** + sync `apps/api/.env.example`, `apps/web/.env.example`.

### Unchanged product behavior

- Embed prefilter default off, Redis key prefixes/TTLs, room/WebSocket protocol, curated catalog content.

## Capabilities

### New Capabilities

- `platform-env`: t3-env + zod; apps `extends`; no ad-hoc `process.env`.
- `platform-feature-flags`: `VKARA_*` in env + `FLAG_DOCS`.
- `platform-redis`: unified connection factory and queue wiring.
- `platform-redis-cache`: shared Redis cache plumbing.
- `monorepo-package-boundaries`: layer rules; **delete** `shared-*` packages (Wave 6).
- `elysia-zod-schemas`: Elysia uses zod only; OpenAPI via `@elysiajs/openapi`; TypeBox removed from api.

### Modified Capabilities

<!-- Product requirements unchanged -->

## Impact

- **~70+ workspace files** importing `@vkara/shared-*` (api + web + curated-playlists).
- **4 Elysia TypeBox files** → zod in `@vkara/validators`.
- **~20 `process.env` call sites** → `env` (api + web).
- **Dependencies add**: `zod`, `@t3-oss/env-core`, `@t3-oss/env-nextjs`, `@elysiajs/openapi` (+ `zod-to-json-schema` if Zod 3).
- **Dependencies remove**: `@vkara/shared-*` packages; `@sinclair/typebox` when api fully migrated.
- **Tests**: env, cache-redis, validators, import path updates across vitest projects.
- **Turbo**: env vars on build tasks; package graph reorder.

## Delivery

One OpenSpec change, **6 implementation waves** (see `design.md`, `tasks.md`). Each wave = 1 PR recommended; final wave deletes `packages/shared-types`, `packages/shared-utils`, `packages/shared-infra`.
