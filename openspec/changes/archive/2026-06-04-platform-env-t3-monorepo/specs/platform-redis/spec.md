## ADDED Requirements

### Requirement: Single Redis options factory

The monorepo MUST expose `@vkara/redis` (renamed from `@vkara/shared-infra`) with `createRedisOptions(env)` returning host, port, optional password, and `maxRetriesPerRequest: null` for BullMQ compatibility.

#### Scenario: API redis client uses factory

- **WHEN** `apps/api/src/redis.ts` creates the shared ioredis client
- **THEN** it MUST use `createRedisOptions` from `@vkara/redis` with validated env

#### Scenario: BullMQ queue uses same options

- **WHEN** `hourly-report` or other BullMQ workers create a Redis connection
- **THEN** they MUST use the same `createRedisOptions` output as the main API client
- **AND** MUST NOT duplicate inline `REDIS_HOST` / `REDIS_PORT` parsing

### Requirement: Redis env in validated schema

`REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` MUST be declared in `redisEnv()` with defaults matching current behavior (`localhost`, `6379`, optional password).

#### Scenario: Default local Redis

- **WHEN** Redis env vars are unset in development
- **THEN** `createRedisOptions` MUST target `localhost:6379` with no password

### Requirement: Package naming retires shared-infra

Workspace dependency `@vkara/shared-infra` MUST be replaced by `@vkara/redis` in all `package.json` files; the old package name MUST NOT remain as the canonical import path after migration.

#### Scenario: Workspace install resolves redis package

- **WHEN** `bun install` runs at the monorepo root
- **THEN** `@vkara/redis` MUST resolve to `packages/redis` (or renamed directory)
- **AND** no consumer MUST import `@vkara/shared-infra`
