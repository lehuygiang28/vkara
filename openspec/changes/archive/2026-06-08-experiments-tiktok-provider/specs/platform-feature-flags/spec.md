## ADDED Requirements

### Requirement: Experiments flag is documented and env-backed

The system MUST define `VKARA_EXPERIMENTS` in `@vkara/env` with `FLAG_DOCS` metadata (default falsy, scope `both`, description for TikTok experiments gating).

#### Scenario: Experiments flag documented

- **WHEN** `FLAG_DOCS` is read for experiments
- **THEN** it MUST list `VKARA_EXPERIMENTS` with default `false` and scope `both`

#### Scenario: Web public mirror for Settings visibility

- **WHEN** the web app needs to show or hide the Experiments Settings section
- **THEN** it MUST read a validated public env field (e.g. `NEXT_PUBLIC_VKARA_EXPERIMENTS`) derived from the same flag semantics

### Requirement: Experiments flag gates TikTok API routes

API code MUST use a typed helper (e.g. `isExperimentsEnabled()`) to mount TikTok plugins and MUST NOT register `POST /tiktok/search` when the flag is falsy.

#### Scenario: API boots without experiments

- **WHEN** `VKARA_EXPERIMENTS` is unset or falsy at API startup
- **THEN** the TikTok Elysia plugin MUST NOT be mounted
- **AND** no Playwright browser pool MUST be initialized eagerly

#### Scenario: API boots with experiments

- **WHEN** `VKARA_EXPERIMENTS` is truthy at API startup
- **THEN** the TikTok search routes MUST be registered on the API server
