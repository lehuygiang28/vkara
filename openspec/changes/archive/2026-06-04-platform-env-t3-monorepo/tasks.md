# Super plan — 6 waves, move hết

> Mỗi wave ≈ 1 PR. Không archive change cho đến khi Wave 6 pass và `shared-*` đã xóa.

## Wave 1 — Foundation (env + redis + tooling)

- [x] 1.1 Pin monorepo **zod** major (4 preferred) in root or `packages/env`
- [x] 1.2 Create `tooling/typescript` (`base.json`, `library.json`, `bun.json`, `nextjs.json`)
- [x] 1.3 Create `packages/env` (`@vkara/env`): deps zod, `@t3-oss/env-core`
- [x] 1.4 Move `parseEnvFlag`, `parseEnvPositiveInt` → `packages/env/src/base.ts` + port `apps/api/tests/config/env.test.ts`
- [x] 1.5 Implement `embedEnv()`, `redisEnv()`, `serverEnv()`, `loggerEnv()` zod factories
- [x] 1.6 Implement `webPublicEnv()`, `webServerEnv()` zod factories
- [x] 1.7 Add `packages/env/src/flags.ts` (`FLAG_DOCS` for all `VKARA_*`)
- [x] 1.8 Rename `packages/shared-infra` → `packages/redis` (`@vkara/redis`)
- [x] 1.9 Update `apps/api/package.json` workspace dep to `@vkara/redis`
- [x] 1.10 Add root `.env.example` (full inventory from design.md)
- [x] 1.11 Add `apps/web/.env.example` section or pointer to root
- [x] 1.12 Update `turbo.json` globalEnv / per-task env if needed for Next build

## Wave 2 — App env + purge process.env

- [x] 2.1 Create `apps/api/src/env.ts` (`extends: embed, redis, server, logger`)
- [x] 2.2 Create `apps/web/src/env.ts` (`@t3-oss/env-nextjs`, extends web factories)
- [x] 2.3 Replace `embed-playability-env.ts` consumers → `@vkara/env`; delete old file
- [x] 2.4 Delete `apps/api/src/config/env.ts` after re-exports removed
- [x] 2.5 `apps/api/src/redis.ts` → `createRedisOptions(env)` from validated env
- [x] 2.6 `apps/api/src/youtubei.ts` → use `@vkara/redis` + env (not raw process.env)
- [x] 2.7 `apps/api/src/queues/hourly-report.ts` → shared redis options
- [x] 2.8 `apps/api/src/queues/cleanup.ts` → shared redis options + `env.EMPTY_ROOM_TIMEOUT`
- [x] 2.9 `apps/api/src/server.ts` → `env.PORT`
- [x] 2.10 `apps/api/src/utils/logger.ts` → `loggerEnv` fields
- [x] 2.11 `apps/api/src/modules/youtube/embeddable.ts` → `env` for public URL
- [x] 2.12 `apps/web/src/middleware.ts` → `env.VKARA_AIO`
- [x] 2.13 `apps/web/src/providers/websocket-provider.tsx` → `env` for WS/API URLs
- [x] 2.14 `apps/web/src/services/client/api-client.ts` → `env.NEXT_PUBLIC_API_URL`
- [x] 2.15 `apps/web/src/lib/site-url.ts`, `seo/metadata.ts`, `layout.tsx`, analytics → `env`
- [x] 2.16 `apps/web/src/app/api/speech/*` → `webServerEnv` fields
- [x] 2.17 `apps/web/next.config.ts` — document or wire `env.ANALYZE` pattern
- [x] 2.18 Sync `apps/api/.env.example` with `FLAG_DOCS`
- [x] 2.19 Grep gate: no `process.env` in `apps/api/src` (except `env.ts`) and `apps/web/src` (except `env.ts`, documented config)
- [x] 2.20 `bun run test` — fix api env tests to use `@vkara/env`

## Wave 3 — Validators + Elysia zod + OpenAPI

- [x] 3.1 Create `packages/validators` with zod; exports map in `package.json`
- [x] 3.2 Port `youTubeVideoSchema`, `captionTrackSchema`, `tvRoomRestoreSchema`, message variants → `packages/validators/src/ws/client-message.ts` (zod)
- [x] 3.3 Export `ClientMessage` = `z.infer<typeof clientMessageSchema>`
- [x] 3.4 Port any HTTP body schemas from `youtubei.ts` → `packages/validators/src/youtube/*.ts`
- [x] 3.5 Update `apps/api/src/plugins/room-ws.plugin.ts` to use zod validator from validators
- [x] 3.6 Update `apps/api/src/youtubei.ts` routes: replace all `t.*` with zod schemas
- [x] 3.7 Update `apps/api/src/server.ts` — register `@elysiajs/openapi` + `mapJsonSchema.zod`
- [x] 3.8 Add `apps/web` dependency on `@vkara/validators` where WS types needed (replace `@vkara/shared-types` WS imports)
- [x] 3.9 Delete `apps/api/src/schemas/client-message.ts`
- [x] 3.10 Remove `@sinclair/typebox` from `apps/api/package.json` if unused
- [x] 3.11 Add smoke test or manual check: GET OpenAPI UI loads
- [x] 3.12 Port/adjust api tests that depended on TypeBox schemas
- [x] 3.13 `bun run test` — ws + youtube route tests green

## Wave 4 — cache-redis

- [x] 4.1 Create `packages/cache-redis` (`createRedisBoolCache`, `createRedisJsonCache`, fail-open)
- [x] 4.2 Unit tests: MGET, pipeline SETEX, JSON invalid → undefined
- [x] 4.3 Refactor `embed-playability-cache.ts` (keys/TTL unchanged)
- [x] 4.4 Refactor `playlist-details-cache.ts`
- [x] 4.5 Refactor `channel-cache.ts`
- [x] 4.6 Confirm `modules/youtube/cache.ts` (in-memory) stays in api — not moved
- [x] 4.7 `bun run test` — embed + playlist cache tests

## Wave 5 — Domain packages (move hết shared-*)

- [x] 5.1 Create `packages/youtube` — move types (`youtube`, `captions`, `playlist-details`) + utils (`youtube-id`, `thumbnail`, `playlist-url`, `live`, `parse-view-count`, …)
- [x] 5.2 Remove `youtubei` from type-only exports; keep runtime mapping in api
- [x] 5.3 Create `packages/room` — `persisted-room`, `playback-sync`, `websocket`, `errors`, `room.ts`, `url.ts` (as applicable)
- [x] 5.4 Create `packages/personalization` — move `shared-utils/src/personalization/*`
- [x] 5.5 Update `packages/curated-playlists` deps: `@vkara/youtube` not `shared-utils`
- [x] 5.6 Update **all** `apps/api` imports: `shared-types` → `youtube` / `room`; `shared-utils` → domain packages
- [x] 5.7 Update **all** `apps/web` imports (grep ~50 files)
- [x] 5.8 Update **all** `packages/*/tests` import paths
- [x] 5.9 Update `apps/web/next.config.ts` `transpilePackages` list for new package names
- [x] 5.10 Extend each new package `tsconfig` from `tooling/typescript`
- [x] 5.11 Vitest projects in `vitest.config.mts` for new packages
- [x] 5.12 `bun run test` full monorepo

## Wave 6 — Delete legacy + verify

- [x] 6.1 Delete `packages/shared-types` directory
- [x] 6.2 Delete `packages/shared-utils` directory
- [x] 6.3 Delete `packages/shared-infra` if any remnant (should be gone after redis rename)
- [x] 6.4 Remove workspace entries from root `package.json` / lockfile refresh (`bun install`)
- [x] 6.5 Grep CI gate: zero `@vkara/shared-`
- [x] 6.6 Grep CI gate: zero `import { t }` in api for validation (except tests if any)
- [x] 6.7 `bun run ci` (test + build api + build web)
- [x] 6.8 Manual smoke: room WS join, search, embed flag off/on, curated panel
- [x] 6.9 Update README / AGENTS.md monorepo map (if exists)
- [x] 6.10 OpenSpec archive readiness: all specs satisfied (recheck after 6.8 smoke)

## Wave 7 — Monorepo lint (ESLint)

- [x] 7.1 Add root `eslint.config.mjs` (typescript-eslint + Next rules for web)
- [x] 7.2 Add `lint` / `lint:fix` scripts to `apps/api`, `apps/web`, all `packages/*`
- [x] 7.3 Root `bun run lint` via Turborepo; wire into `bun run ci`
- [x] 7.4 ESLint rules: ban `@vkara/shared-*`, packages→apps imports, web→api imports
- [x] 7.5 `bun run lint` green across workspace

## Post-archive (optional cleanup)

- [x] 8.1 Promote main specs under `openspec/specs/` for platform-*, `elysia-zod-schemas`, `monorepo-quality` from change deltas
- [x] 8.2 Consider `@vkara/contracts` alias doc if external consumers existed (none expected)
