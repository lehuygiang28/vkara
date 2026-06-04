# platform-env Specification

## Purpose
TBD - created by archiving change platform-env-t3-monorepo. Update Purpose after archive.
## Requirements
### Requirement: Centralized environment validation

The monorepo MUST provide an `@vkara/env` package that validates environment variables using `@t3-oss/env-core` (API and shared packages) and `@t3-oss/env-nextjs` (web app) with **zod** schemas. This MUST align with the Elysia API’s [Standard Schema / Zod OpenAPI](https://elysiajs.com/patterns/openapi.html#zod-openapi) direction so env and route validation can share zod over time.

#### Scenario: API boot with valid env

- **WHEN** the API process starts with required Redis and server variables set correctly
- **THEN** `apps/api/src/env.ts` MUST expose a typed `env` object without runtime parse errors

#### Scenario: API boot with invalid env

- **WHEN** a required server variable is missing or fails schema validation
- **THEN** the API MUST fail fast at startup with a clear validation error from t3-env

#### Scenario: CI and lint skip validation

- **WHEN** `CI` is set or `npm_lifecycle_event` is `lint`
- **THEN** env validation MAY be skipped via `skipValidation` consistent with create-t3-turbo

### Requirement: Domain env factories with extends

`@vkara/env` MUST export domain factories (at minimum `embedEnv()`, `redisEnv()`, `serverEnv()` for API and `webPublicEnv()` for web) that apps compose using `createEnv({ extends: [...] })`.

#### Scenario: API composes embed and redis env

- **WHEN** `apps/api/src/env.ts` is loaded
- **THEN** it MUST `extends` embed and redis presets so `VKARA_EMBED_*` and `REDIS_*` variables are available on `env`

#### Scenario: Web composes public env only

- **WHEN** `apps/web/src/env.ts` is loaded
- **THEN** it MUST validate `NEXT_PUBLIC_*` and web-specific flags (e.g. `VKARA_AIO`) without importing API-only secrets

### Requirement: Canonical env parsers

Base parsers `parseEnvFlagValue` and `parseEnvPositiveIntValue` MUST live in `@vkara/env` and preserve existing semantics: flags accept `true`/`false`/`1`/`0`/`yes`/`no`/`on`/`off` (case-insensitive); invalid flag values fall back to the provided default; positive integers must be finite and > 0 or fall back to default. Application code MUST pass raw strings from validated env objects, not env var names.

#### Scenario: Flag parser backward compatibility

- **WHEN** `VKARA_EMBED_PREFILTER_AT_LIST` is set to `on`
- **THEN** `parseEnvFlagValue('on')` MUST return true

#### Scenario: Invalid flag uses default

- **WHEN** a flag env var is set to an unrecognized string
- **THEN** `parseEnvFlagValue` MUST return the declared default value

### Requirement: No ad-hoc process.env in application code

After migration, application modules in `apps/api` and `apps/web` MUST NOT read `process.env` directly except inside env definition files (`src/env.ts`, `next.config.ts` edge cases documented in design).

#### Scenario: Middleware uses validated env

- **WHEN** web middleware checks `VKARA_AIO`
- **THEN** it MUST read from the web `env` object, not `process.env.VKARA_AIO`

### Requirement: Full process.env purge in production code

After Wave 2, `apps/api` and `apps/web` production source MUST NOT read `process.env` except in `src/env.ts`, framework config files documented in design (`next.config.ts`), and test files.

#### Scenario: Logger uses env

- **WHEN** `apps/api/src/utils/logger.ts` initializes winston
- **THEN** it MUST read `LOG_*` from the validated api `env` object

#### Scenario: Embeddable origin uses env

- **WHEN** embed playability checks need public app URL
- **THEN** `embeddable.ts` MUST use `env.PUBLIC_APP_URL` (or composed URL helper from env), not `process.env.PUBLIC_APP_URL`

#### Scenario: Web speech route uses env

- **WHEN** `apps/web/src/app/api/speech/*` runs
- **THEN** `WHISPER_URL` and `HF_TOKEN` MUST come from web `env` server schema

