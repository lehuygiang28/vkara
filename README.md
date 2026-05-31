# vkara Monorepo

This repository uses Bun workspaces to host all vkara applications.

## Workspace layout

- `apps/web`: Next.js frontend
- `apps/api`: Elysia API + WebSocket backend
- `packages/shared-types`: shared contract types for web/api

## Development

- `bun install`
- `bun run dev:web`
- `bun run dev:api`

## Contract rule

Shared API/WebSocket contracts must live in `packages/shared-types`.  
Do not duplicate protocol types inside app-specific folders.

## Docker deployment

Production images and compose profiles are documented in **[containers/README.md](./containers/README.md)**.

| Image | Purpose |
|-------|---------|
| `lehuygiang28/vkara-api` | API only |
| `lehuygiang28/vkara-web` | Web only |
| `lehuygiang28/vkara-api-redis` | API + Redis |
| `lehuygiang28/vkara-aio` | All-in-one (`:3000`) |

```bash
docker compose --profile aio up --build
```
