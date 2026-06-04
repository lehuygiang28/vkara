# platform-feature-flags Specification

## Purpose
TBD - created by archiving change platform-env-t3-monorepo. Update Purpose after archive.
## Requirements
### Requirement: VKARA feature flags are env-backed

Product feature toggles MUST use the `VKARA_` prefix and be defined in `@vkara/env` zod schemas alongside `FLAG_DOCS` metadata (name, default, scope `api` | `web` | `both`, description).

#### Scenario: Embed prefilter flag documented

- **WHEN** `FLAG_DOCS` is read for embed prefilter
- **THEN** it MUST list `VKARA_EMBED_PREFILTER_AT_LIST` with default `false` and scope `api`

#### Scenario: AIO deploy flag documented

- **WHEN** `FLAG_DOCS` is read for all-in-one deploy mode
- **THEN** it MUST list `VKARA_AIO` with scope `web` (or `both` if api gains usage later)

### Requirement: Embed prefilter default unchanged

`VKARA_EMBED_PREFILTER_AT_LIST` MUST default to disabled (falsy) when unset, preserving current list endpoint behavior per `youtube-embed-playability` spec.

#### Scenario: Unset prefilter flag

- **WHEN** `VKARA_EMBED_PREFILTER_AT_LIST` is not set
- **THEN** list endpoints MUST NOT filter by embed playability
- **AND** WebSocket room mutations MUST still perform embed checks

### Requirement: Flag access through env or typed helpers

API code MUST obtain flag values from `embedEnv()` / `apps/api/src/env.ts` or thin helpers that delegate to validated env — not duplicate `parseEnvFlag` calls with raw env key strings in feature modules.

#### Scenario: Prepare videos reads prefilter from env layer

- **WHEN** `prepareYoutubeVideos` checks whether list prefilter is enabled
- **THEN** it MUST use the shared embed env helper or `env` field produced by `@vkara/env`

### Requirement: Root env example documents flags

Root `.env.example` MUST document every `VKARA_*` flag with comment text derived from or consistent with `FLAG_DOCS`.

#### Scenario: Developer copies root example

- **WHEN** a developer copies `.env.example` to `.env` for local development
- **THEN** they MUST see all documented `VKARA_*` flags with defaults commented

