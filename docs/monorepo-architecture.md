# Monorepo Architecture Guidelines

## Package Boundaries
- `apps/*`: product-specific runtime code (API server, web app UI).
- `packages/env`: t3-env factories, `FLAG_DOCS`, shared env parsers.
- `packages/validators`: zod schemas for WebSocket client messages and YouTube HTTP bodies.
- `packages/youtube`: YouTube domain types and utilities.
- `packages/room`: room state, server WS messages, playback-sync, room URL helpers.
- `packages/personalization`: browse-feed ranking and profile.
- `packages/redis`: `createRedisOptions` for ioredis / BullMQ.
- `packages/cache-redis`: reusable Redis bool/JSON cache helpers.

## Placement Rules
- Put code in `packages/*` when it is used by 2+ apps.
- Keep app-only behavior in that app; do not extract prematurely.
- Prefer subpath imports (`@vkara/validators/ws/client-message`) over barrel re-exports when only one symbol is needed.

## Anti-Patterns To Avoid
- Repeating env parsing/connection configuration across modules.
- Duplicating WS message unions in `room` when `validators` already defines the zod schema.
- Re-exporting types from another package without adding value.
- Duplicating fetch/serialization boilerplate in multiple web services.
- Building giant mixed-responsibility modules (cache + transport + mapping + handlers).

## Refactor Safety Rules
- Keep route and message contracts stable during internal moves.
- Single source of truth: `ClientMessage` / `TvRoomRestoreState` from `@vkara/validators`.
- Require `bun run test`, `bun run typecheck`, `bun run lint`, and build before removing old modules.

## Quality gates

| Command | Scope |
|---------|--------|
| `bun run test` | Vitest projects (api, web, packages) |
| `bun run typecheck` | `apps/api`, `apps/web` TypeScript |
| `bun run lint` | ESLint via Turborepo (all apps + packages) |
| `bun run ci` | test → typecheck → lint → build |

Lint config lives at repo root (`eslint.config.mjs`). Do not add per-app ESLint configs unless extending the root file.
