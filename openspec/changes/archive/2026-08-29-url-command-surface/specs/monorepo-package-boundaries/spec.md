## ADDED Requirements

### Requirement: URL command kernel is a domain package

The parse/serialize/idempotency-id helpers for the URL command document MUST live in a domain package `@vkara/url-commands`. That package MUST depend on `@vkara/validators` and MAY depend on `@vkara/room` for `isValidRoomId`. It MUST NOT import from `apps/*`, React, Next, or WebSocket client stores. The Zod schema for the command document MUST live in `@vkara/validators`. Apps MUST apply commands through adapters; they MUST NOT duplicate the parser.

#### Scenario: Web imports the shared parser

- **WHEN** `apps/web` applies a query command document
- **THEN** it MUST import parse/serialize from `@vkara/url-commands`
- **AND** MUST NOT reimplement key allowlists in a page-local helper

#### Scenario: MCP imports the same parser

- **WHEN** MCP `build_url` or `validate` runs
- **THEN** it MUST use `@vkara/url-commands` and the same validators schema

#### Scenario: Package layer direction

- **WHEN** `@vkara/url-commands` is typechecked
- **THEN** it MUST NOT import from `apps/web` or `apps/api`
