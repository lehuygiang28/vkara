# monorepo-quality Specification

## Purpose
TBD - created by archiving change platform-env-t3-monorepo. Update Purpose after archive.
## Requirements
### Requirement: Monorepo-wide ESLint

The workspace MUST run ESLint from a single root `eslint.config.mjs` that covers `apps/*` and `packages/*`. Every app and internal package with TypeScript source MUST expose `lint` and `lint:fix` scripts. Root `bun run lint` MUST execute lint across the monorepo via Turborepo.

#### Scenario: Root lint command

- **WHEN** a developer runs `bun run lint` from the repository root
- **THEN** Turborepo MUST run `lint` in `@vkara/api`, `@vkara/web`, and all `packages/*` workspaces that ship TypeScript
- **AND** the command MUST exit non-zero if any workspace reports ESLint errors

#### Scenario: CI includes lint

- **WHEN** `bun run ci` runs in CI or locally before merge
- **THEN** it MUST include `bun run lint` after tests and typecheck and before build

### Requirement: Lint enforces package boundaries

ESLint MUST forbid legacy `@vkara/shared-*` imports in application and package code. Packages MUST NOT import from `apps/`. The web app MUST NOT import from `apps/api/`.

#### Scenario: Legacy shared import blocked

- **WHEN** a file under `packages/` contains `import … from '@vkara/shared-types'`
- **THEN** ESLint MUST report `no-restricted-imports`

#### Scenario: Package importing app blocked

- **WHEN** a file under `packages/youtube/` imports from `../../apps/api/`
- **THEN** ESLint MUST report `no-restricted-imports`

### Requirement: Web lint uses Next.js rules

Files under `apps/web/` MUST be linted with `next/core-web-vitals` and `next/typescript` presets in addition to the shared TypeScript rules.

#### Scenario: Web workspace lint

- **WHEN** `bun run lint --filter=@vkara/web` runs
- **THEN** ESLint MUST apply Next.js rules to `apps/web/src/**/*.{ts,tsx}`

### Requirement: Typecheck complements lint

TypeScript `noEmit` checks MUST remain available via `bun run typecheck` for `@vkara/api` and `@vkara/web`. Lint does not replace typecheck.

#### Scenario: CI quality gates

- **WHEN** `bun run ci` completes successfully
- **THEN** tests, typecheck, lint, and build MUST all have passed

