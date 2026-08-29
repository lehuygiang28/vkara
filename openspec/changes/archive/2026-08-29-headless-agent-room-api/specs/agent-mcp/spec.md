## MODIFIED Requirements

### Requirement: v1 MCP is a factory plus search and token mint

v1 MCP MUST provide: validate command, build URL, search videos (existing HTTP search), mint `once`, and mint `joinToken`. v1 MUST NOT open a WebSocket as a hidden participant using the TV/browser `deviceId`. Room mutations for headless agents MUST use the HTTP room-control session and `queue` / `play` / `next` routes (same bind `{ roomId, displayName }`). In-tab URL apply remains valid for browser agents and MUST keep a matching `roomId`.

#### Scenario: Mint once for a queue URL

- **WHEN** MCP builds a `queue` command URL
- **THEN** the URL MUST include a fresh `once` token
- **AND** MUST include `name` and `roomId`

#### Scenario: No ghost participant in v1

- **WHEN** v1 MCP is running
- **THEN** it MUST NOT send `joinRoom` on a socket that reuses the host device cookie

#### Scenario: Headless apply uses HTTP session

- **WHEN** a headless agent is bound to room `4821` and needs to queue a video
- **THEN** the documented path MUST be HTTP session + `/url-commands/queue`
- **AND** MUST NOT require opening a browser WebSocket

## ADDED Requirements

### Requirement: Agent docs teach HTTP and URL paths

`llms.txt` and `docs/agents/mcp.md` MUST describe both the browser URL-command path and the HTTP session/command path. Case A (invite only) MUST still reply with capability bullets and MUST NOT mutate. Case B (invite + task) MUST join via session or URL, then apply the task, then report concrete results.

#### Scenario: Case A does not queue

- **WHEN** the user message is only the invite line and the agent has created a session
- **THEN** the agent docs MUST instruct no search/queue/play yet
- **AND** MUST list the HTTP-capable operations (search, queue, play, next)

#### Scenario: Case B uses HTTP when no browser

- **WHEN** the user asks to add songs and the agent has no browser
- **THEN** the docs MUST instruct `POST /search` then `POST /url-commands/queue` with session + `once`

### Requirement: HTTP mint-join-token refuses passwordless rooms

`POST /url-commands/mint-join-token` MUST require the room password when the room has one. When the room has no password, the HTTP mint MUST refuse with the same status and error code as a missing room. A current WebSocket participant MAY mint a `joinToken` for that open room. Anonymous HTTP callers MUST NOT obtain a token for any passwordless live room.

#### Scenario: Open room HTTP mint refused

- **WHEN** room `4821` has no password
- **AND** a caller `POST`s `/url-commands/mint-join-token` with only bind
- **THEN** the API MUST NOT return a `joinToken`

#### Scenario: In-room WS mint for an open room

- **WHEN** a connected participant in passwordless room `4821` requests a join token on WebSocket
- **THEN** the API MAY return a single-use `joinToken` bound to `4821`
