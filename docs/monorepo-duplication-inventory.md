# Monorepo Duplication Inventory

## Scope
- `apps/api`
- `apps/web`
- `packages/shared-types`

## Duplication Matrix

### Infra Setup
- **Redis config duplicated** in `apps/api/src/redis.ts` and `apps/api/src/youtubei.ts`.
- **Resolution:** centralize in `@vkara/shared-infra/redis` and import everywhere.

### YouTube API module responsibilities
- **Large mixed concerns** in `apps/api/src/youtubei.ts`:
  - cache lifecycle
  - embeddable checks
  - API handlers
  - video mapping
- **Resolution:** split into:
  - `apps/api/src/modules/youtube/cache.ts`
  - `apps/api/src/modules/youtube/embeddable.ts`
  - `apps/api/src/modules/youtube/video-mapper.ts`

### Web fetch/request boilerplate
- **Repeated logic** in `apps/web/src/services/youtube-api.ts`:
  - URL composition
  - JSON headers
  - response parsing
- **Resolution:** central `apiPost()` helper in `apps/web/src/services/client/api-client.ts`.

### Shared contracts
- **Status:** contracts are already centralized in `packages/shared-types`.
- **Action:** keep app-level type files as import aliases only; do not define duplicate contracts in app packages.

## Keep/Remove Decisions
- Keep `packages/shared-types` as the only contract source.
- Keep one redis options/client factory in `@vkara/shared-infra`.
- Remove inline redis config objects from API modules.
- Remove ad-hoc POST boilerplate in web service functions.

## Migration Order
1. Extract and adopt shared infra (`@vkara/shared-infra`).
2. Split API YouTube internals into cohesive modules.
3. Normalize web client request layer.
4. Remove old duplication remnants and enforce boundaries.
