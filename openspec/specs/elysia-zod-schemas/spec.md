# elysia-zod-schemas Specification

## Purpose
TBD - created by archiving change platform-env-t3-monorepo. Update Purpose after archive.
## Requirements
### Requirement: API validation uses zod only

After migration, the Elysia API MUST NOT use TypeBox `t` from `elysia` for route or WebSocket body validation. All runtime validation schemas MUST live in `@vkara/validators` as zod schemas.

#### Scenario: WebSocket client messages validated with zod

- **WHEN** a WebSocket client sends a `ClientMessage` payload
- **THEN** the server MUST validate using the zod schema exported from `@vkara/validators`
- **AND** MUST NOT import validation from `apps/api/src/schemas/client-message.ts` using TypeBox

#### Scenario: No TypeBox dependency in api package

- **WHEN** Wave 6 is complete
- **THEN** `apps/api/package.json` MUST NOT list `@sinclair/typebox` as a dependency
- **AND** `grep` for `import { t }` from `elysia` in api schema paths MUST return zero matches

### Requirement: OpenAPI documents zod schemas

The API MUST register `@elysiajs/openapi` with a zod JSON Schema mapper per [Elysia Zod OpenAPI](https://elysiajs.com/patterns/openapi.html#zod-openapi).

#### Scenario: OpenAPI page available

- **WHEN** the API server is running in development
- **THEN** the configured OpenAPI path (default `/openapi`) MUST render documentation for HTTP routes
- **AND** zod-based routes MUST appear with correct request body schemas

#### Scenario: Zod mapper configured

- **WHEN** the OpenAPI plugin is initialized
- **THEN** `mapJsonSchema` MUST include a `zod` entry (`z.toJSONSchema` for Zod 4 or equivalent for Zod 3)

### Requirement: Inferred types from zod

Public TypeScript types for validated payloads MUST be derived via `z.infer<typeof schema>` from `@vkara/validators` (or re-exported from domain packages), not parallel hand-written interfaces that can drift.

#### Scenario: ClientMessage type matches schema

- **WHEN** TypeScript compiles `apps/api` and `apps/web`
- **THEN** `ClientMessage` (or successor export name) MUST be inferred from the zod schema used at runtime

