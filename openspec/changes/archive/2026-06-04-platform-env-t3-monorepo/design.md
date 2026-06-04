## Context

Current monorepo (inventory):

| Area | Today | Problem |
|------|-------|---------|
| Packages | `shared-types`, `shared-utils`, `shared-infra`, `curated-playlists` | Catch-all naming; `shared-types` depends on `youtubei` |
| Env | `apps/api/src/config/env.ts`, `embed-playability-env.ts`; web `process.env` × ~12 files | No fail-fast; inconsistent |
| Redis | `redis.ts`, `hourly-report.ts`, `cleanup.ts`, `youtubei.ts` each parse `REDIS_*` | Drift risk |
| Cache | 3× copy-paste Redis modules + in-memory youtube continuation `cache.ts` | Only Redis blobs dedupe |
| API schemas | TypeBox `t` in `client-message.ts`, `youtubei.ts`, `room-ws.plugin.ts`, `server.ts` | Split from zod/t3-env target |
| Imports | ~70 files `@vkara/shared-*` | No domain boundaries |

References: [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo), [t3-env](https://env.t3.gg), [Elysia Zod OpenAPI](https://elysiajs.com/patterns/openapi.html#zod-openapi).

## Goals / Non-Goals

**Goals (end state):**

```text
vkara/
├── .env.example
├── tooling/typescript/
├── apps/api/src/env.ts          # t3-env extends
├── apps/web/src/env.ts
└── packages/
    ├── env/                   # zod factories + FLAG_DOCS + parsers
    ├── redis/                 # createRedisOptions
    ├── cache-redis/
    ├── validators/            # ALL zod: WS + HTTP + shared DTOs
    ├── youtube/
    ├── room/
    ├── personalization/
    └── curated-playlists/
    (shared-types DELETED)
    (shared-utils DELETED)
    (shared-infra DELETED)
```

- **One schema language**: zod (env, validators, Elysia Standard Schema).
- **One env access pattern**: `import { env } from '@/env'` (per app).
- **One Redis config path**: `@vkara/redis` + validated env.
- **Domain packages** replace every `shared-*` export.
- **OpenAPI** on api via `@elysiajs/openapi` + zod mapper.
- **Product behavior unchanged** (embed, rooms, curated).

**Non-Goals:**

- LaunchDarkly / Unleash.
- tRPC `packages/api` router.
- Compiled `dist/` internal packages (stay JIT unless CI forces).
- Changing embed HTML logic, room business rules, or `playlists.json` content.

## Target dependency graph

```text
                    ┌─────────────┐     ┌─────────────┐
                    │  apps/api   │     │  apps/web   │
                    └──────┬──────┘     └──────┬──────┘
                           │                    │
         ┌─────────────────┼────────────────────┼─────────────────┐
         ▼                 ▼                    ▼                 ▼
   @vkara/validators  @vkara/youtube      @vkara/room    @vkara/personalization
         │                 │                    │                 │
         └────────┬────────┴────────────┬───────┴─────────────────┘
                  ▼                     ▼
            @vkara/curated-playlists   @vkara/cache-redis
                  │                     │
                  └──────────┬──────────┘
                             ▼
                    @vkara/redis ← @vkara/env
                             ▼
                    tooling/typescript
```

## Decisions

### 1. Super-plan: full migration, no permanent shims

**Choice:** Complete all waves in this change; **delete** `shared-*` packages in Wave 6. Short-lived re-export shims allowed only mid-wave if a PR must merge early — must be removed before archive.

**Rejected:** “Phase C optional” or indefinite `shared-utils` barrel.

### 2. `@vkara/env` — full variable inventory

| Factory | Variables (from codebase audit) |
|---------|----------------------------------|
| `embedEnv()` | `VKARA_EMBED_PREFILTER_AT_LIST`, `VKARA_EMBED_CACHE_TTL_SECONDS`, `PUBLIC_APP_URL`, `APP_PUBLIC_URL`, `WEB_ORIGIN` |
| `redisEnv()` | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| `serverEnv()` | `NODE_ENV`, `PORT`, `SERVICE_REPORT_CRON`, `EMPTY_ROOM_TIMEOUT` |
| `loggerEnv()` | `LOG_TO_FILES`, `LOG_LEVEL`, `ERROR_LOG_PATH`, `COMBINED_LOG_PATH` |
| `webPublicEnv()` | `NEXT_PUBLIC_*`, `VKARA_AIO`, `GOOGLE_SITE_VERIFICATION`, `ANALYZE` |
| `webServerEnv()` | `WHISPER_URL`, `HF_TOKEN`, `VERCEL_*` (route handlers) |

Apps compose via `createEnv({ extends: [...] })` + `skipValidation` for CI/lint (T3-turbo).

### 3. Zod version

**Choice:** **Zod 4** if compatible with Bun lockfile; use `z.toJSONSchema` in `@elysiajs/openapi`. If blockers, Zod 3 + `zod-to-json-schema` — pick once in Wave 1, document in `packages/env/README.md`.

### 4. Elysia: TypeBox → zod (Wave 3)

| File | Action |
|------|--------|
| `schemas/client-message.ts` | Move to `packages/validators/src/ws/client-message.ts` as zod; infer `ClientMessage` type |
| `plugins/room-ws.plugin.ts` | Use zod schema from validators |
| `youtubei.ts` | Replace route `body`/`query` `t.*` with zod |
| `server.ts` | OpenAPI plugin + any remaining `t` |

Register globally:

```typescript
import { openapi } from '@elysiajs/openapi'
import * as z from 'zod'

.use(openapi({ mapJsonSchema: { zod: z.toJSONSchema } }))
```

### 5. `@vkara/validators` structure

```text
packages/validators/src/
  ws/client-message.ts
  ws/server-message.ts      # if extracted from shared-types
  youtube/                  # request/response bodies for HTTP
  index.ts
```

Types: `z.infer<typeof schema>` exported alongside schemas. `shared-types` types migrate to domain packages or validators as appropriate (pure types without youtubei in `@vkara/youtube`).

### 6. Domain split map

| From `shared-types` | To |
|---------------------|-----|
| `youtube.ts`, `youtube-playlist-details.ts`, `captions.ts` | `@vkara/youtube` |
| `persisted-room.ts`, `playback-sync.ts`, `websocket.ts`, `errors.ts` | `@vkara/room` |

| From `shared-utils` | To |
|---------------------|-----|
| `youtube-*`, `parse-view-count`, `format` (youtube-related) | `@vkara/youtube` |
| `room.ts`, `url.ts` (room) | `@vkara/room` |
| `personalization/*` | `@vkara/personalization` |

`@vkara/curated-playlists` → depend on `@vkara/youtube` not `shared-utils`.

### 7. `@vkara/cache-redis` + domain TTL policy

Helpers: `createRedisBoolCache`, `createRedisJsonCache`. Domain modules keep prefix/TTL constants. **Do not** move in-memory `youtube/cache.ts` (search/related continuations).

### 8. Tooling

`tooling/typescript` with `base.json`, `library.json`, `nextjs.json`, `bun.json` — each package `extends` (T3-turbo).

## Implementation waves (super plan)

```text
Wave 1 ─ Foundation     env, redis rename, tooling/typescript, root .env.example
Wave 2 ─ Env sweep      apps/api + apps/web env.ts; purge process.env (prod code)
Wave 3 ─ Zod API        validators package; migrate TypeBox → zod; @elysiajs/openapi
Wave 4 ─ Cache          @vkara/cache-redis + 3 youtube redis modules
Wave 5 ─ Domain split   youtube, room, personalization; update all imports
Wave 6 ─ Delete legacy  remove shared-types, shared-utils, shared-infra; ci green
```

**PR strategy:** 1 wave = 1 PR (6 PRs). Do not merge Wave 6 until grep shows zero `shared-*` and zero `from 'elysia'` `t` in api schemas.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Large PR / merge conflicts | Strict wave order; Wave 5 can split by package (youtube PR, room PR) if needed |
| WS schema drift zod vs old TypeBox | Port tests from `client-message`; WS integration tests |
| `youtubei` on types package | Wave 5 spike: types-only in `@vkara/youtube`, runtime mapping stays in api |
| Web build env bundle | `@t3-oss/env-nextjs` + `runtimeEnv` explicit list |
| Zod 4 ecosystem | Pin version; fallback to Zod 3 + `zod-to-json-schema` |

## Rollback

Per-wave git revert. Redis keys unchanged. If Wave 6 reverted, restore `shared-*` packages from git history.

## Resolved (was open questions)

- **Full migration in-scope** — not optional Phase C.
- **No long-term shims** — delete `shared-*` in Wave 6.
- **Zod everywhere** for env + Elysia; TypeBox removed from api.
- **Per-app `.env`** + root `.env.example` as source of truth.
