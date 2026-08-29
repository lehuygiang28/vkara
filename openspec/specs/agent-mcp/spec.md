# agent-mcp Specification

## Purpose

HTTP factory for AI agents: validate/build URL commands, mint tokens. v1 does not join WebSocket as a hidden participant.

## Requirements

### Requirement: MCP shares the URL command schema

The MCP server MUST validate and build command URLs using the same Zod command document as the web parser (`@vkara/validators` / `@vkara/url-commands`). Tool names and docs MUST NOT invent a second catalog of keys.

#### Scenario: build_url output is parseable

- **WHEN** an MCP `build_url` tool is called with `{ roomId, name, q, karaoke }`
- **THEN** the returned URL query MUST parse into the same command document the web applicator accepts

#### Scenario: Unknown tool verb rejected

- **WHEN** a client asks MCP to put `clearQueue` or `kick` into a URL
- **THEN** the tool MUST refuse
- **AND** MUST NOT emit those keys

### Requirement: MCP binds room and display name

MCP configuration or a bind tool MUST require a target `roomId` and a display `name` for any mutating tool. The first successful session/tool result MUST echo `{ roomId, displayName }`. Tools that mutate a room MUST refuse if the requested `roomId` does not match the bound room.

#### Scenario: Wrong-room tool call

- **WHEN** MCP is bound to room `4821` and a tool is called with `roomId=9999`
- **THEN** the tool MUST fail without emitting a mutating command URL for `9999`

#### Scenario: Connect snippet documents env

- **WHEN** a developer reads the MCP docs
- **THEN** the page MUST show a Cursor/MCP config using `VKARA_DISPLAY_NAME` and `VKARA_ROOM_ID` (password or join token optional)

### Requirement: v1 MCP is a factory plus search and token mint

v1 MCP MUST provide: validate command, build URL, search videos (existing HTTP search), mint `once`, and mint `joinToken`. v1 MUST NOT open a WebSocket as a hidden participant using the TV/browser `deviceId`. In-tab `apply_command` MAY be added later and MUST call the same applicator ports with a mandatory matching `roomId`.

#### Scenario: Mint once for a queue URL

- **WHEN** MCP builds a `queue` command URL
- **THEN** the URL MUST include a fresh `once` token
- **AND** MUST include `name` and `roomId`

#### Scenario: No ghost participant in v1

- **WHEN** v1 MCP is running
- **THEN** it MUST NOT send `joinRoom` on a socket that reuses the host device cookie

### Requirement: Join tokens are single-use and short-lived

The API MUST mint `joinToken` values that authenticate a single join to one `roomId`, expire after a documented TTL, and become invalid after first successful use. Tokens MUST be stored server-side (Redis or equivalent). The web client MUST treat `joinToken` as a secret: stash then strip like `password`.

#### Scenario: Token cannot be replayed

- **WHEN** a `joinToken` has already been used to join its room
- **THEN** a second `joinRoom` with that token MUST fail

#### Scenario: Token does not export the rejoin vault

- **WHEN** MCP mints a `joinToken`
- **THEN** the response MUST NOT include other rooms' passwords from any client vault
