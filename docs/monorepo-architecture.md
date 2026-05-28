# Monorepo Architecture Guidelines

## Package Boundaries
- `apps/*`: product-specific runtime code (API server, web app UI).
- `packages/shared-types`: cross-app contracts and domain types.
- `packages/shared-infra`: reusable infra factories and setup helpers.

## Placement Rules
- Put code in `packages/*` when it is used by 2+ apps.
- Keep app-only behavior in that app; do not extract prematurely.
- Export shared package APIs from `src/index.ts` and avoid deep imports in consumers.

## Anti-Patterns To Avoid
- Repeating env parsing/connection configuration across modules.
- Defining duplicate type contracts in app code when shared contracts exist.
- Duplicating fetch/serialization boilerplate in multiple web services.
- Building giant mixed-responsibility modules (cache + transport + mapping + handlers).

## Refactor Safety Rules
- Keep route and message contracts stable during internal moves.
- Migrate with compatibility imports first, then remove legacy paths.
- Require build/lint checks before removing old modules.
