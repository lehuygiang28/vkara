# monorepo-package-boundaries Specification

## Purpose
TBD - created by archiving change platform-env-t3-monorepo. Update Purpose after archive.
## Requirements
### Requirement: Package layers and dependency direction

Internal packages MUST follow dependency direction: **apps → domain → platform → tooling**. Domain packages MUST NOT depend on apps. Platform packages MUST NOT depend on domain packages.

#### Scenario: Env package has no youtube imports

- **WHEN** `@vkara/env` is typechecked
- **THEN** it MUST NOT import from `@vkara/youtube`, `@vkara/room`, or deleted `shared-*` packages

### Requirement: shared packages removed at completion

The packages `@vkara/shared-types`, `@vkara/shared-utils`, and `@vkara/shared-infra` MUST be deleted from the workspace when this change is archived. No production code MAY import them.

#### Scenario: Zero shared imports before archive

- **WHEN** Wave 6 verification runs
- **THEN** ripgrep for `@vkara/shared-types`, `@vkara/shared-utils`, and `@vkara/shared-infra` across `apps/` and `packages/` MUST return zero matches

#### Scenario: Workspace package.json clean

- **WHEN** the root and app `package.json` files are read
- **THEN** they MUST NOT reference workspace dependencies on deleted `shared-*` packages

### Requirement: Domain packages own all former shared code

All code formerly in `shared-types` and `shared-utils` MUST live in the domain packages below (not in apps or new `shared-*` packages).

| Former location | New package |
|---------------|-------------|
| YouTube types/utils | `@vkara/youtube` |
| Room / WS / errors / playback | `@vkara/room` |
| Personalization | `@vkara/personalization` |
| Curated catalog | `@vkara/curated-playlists` (existing) |

#### Scenario: New YouTube helper

- **WHEN** code needs `parseYoutubePlaylistInput`
- **THEN** it MUST import from `@vkara/youtube`, not from a `shared-*` path

### Requirement: Validators package for all zod schemas

`@vkara/validators` MUST contain zod schemas shared by api and web (WebSocket messages, HTTP DTOs). Env-specific zod MUST remain in `@vkara/env` factories.

#### Scenario: Cross-app DTO single source

- **WHEN** api and web both validate the same WebSocket message shape
- **THEN** they MUST import the same schema from `@vkara/validators`

### Requirement: Tooling package exists

`tooling/typescript` MUST provide shared `tsconfig` presets consumed by all packages and apps.

#### Scenario: Package extends shared tsconfig

- **WHEN** a new package is added under `packages/`
- **THEN** its `tsconfig.json` MUST extend from `tooling/typescript` presets

