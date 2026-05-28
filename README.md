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
