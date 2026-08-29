## ADDED Requirements

### Requirement: HTTP session requires an unguessable capability

The API MUST create an agent session only when the caller supplies a valid `joinToken` for `bind.roomId` or a `password` that matches a room that has a password. The API MUST NOT create a session for a passwordless room from `{ roomId, displayName }` alone. The response MUST echo `{ roomId, displayName }` and a `sessionToken`. The server MUST generate a high-entropy `deviceId` and MUST NOT return it. The participant MUST be upserted with `isAgent: true` and MUST NOT receive a live `connectionIds` entry. The session MUST NOT count as a connected client for empty-room cleanup. Wrong token, wrong password, missing room, and locked-unknown-device MUST share one HTTP status and one error code.

#### Scenario: Session created with password

- **WHEN** a caller `POST`s `/url-commands/session` with `bind.roomId=4821`, `bind.displayName=Claude`, and the room password
- **THEN** the API MUST return a `sessionToken` and a cleaned room snapshot
- **AND** MUST list a participant named `Claude` with `isAgent: true`

#### Scenario: joinToken creates the session and cannot be replayed

- **WHEN** a valid unused `joinToken` for room `4821` is sent to `POST /url-commands/session` with matching `bind.roomId`
- **THEN** the API MUST create the session for `4821`
- **AND** a second session create with that same `joinToken` MUST fail

#### Scenario: Passwordless roomId-only join refused

- **WHEN** room `4821` has no password
- **AND** a caller `POST`s `/url-commands/session` with only `bind` and no `joinToken`
- **THEN** the API MUST NOT create a session
- **AND** MUST NOT upsert a participant

#### Scenario: Wrong secret looks like a missing room

- **WHEN** the room has a password and the session body password does not match
- **THEN** the API MUST NOT create a session
- **AND** the status and error code MUST match a session create for a room id that does not exist

### Requirement: Mutation target is the Redis session room only

Authenticated session calls MUST take the target `roomId` only from `agent-session:{token}`. `bind.roomId` MUST be an exact confirm match. A mismatch MUST fail without loading, watching, or mutating the bind-claimed room and without consuming `once`. The API MUST NOT select a room from the URL path, query string, or extra headers. The session `roomId` MUST NOT change after create.

#### Scenario: Wrong-room bind refused

- **WHEN** the session is bound to `4821` and the body `bind.roomId` is `9999`
- **THEN** the API MUST fail
- **AND** MUST NOT mutate room `4821` or `9999`
- **AND** MUST NOT consume `once`

#### Scenario: Session cannot switch rooms

- **WHEN** a session created for `4821` is reused with any payload naming `9999`
- **THEN** the API MUST refuse
- **AND** the Redis session row MUST still name `4821`

### Requirement: HTTP queue play and next mutate the same room aggregate

Authenticated session calls to `POST /url-commands/queue`, `/play`, and `/next` MUST apply the same embed and queue invariants as WebSocket `addVideo` / `playNow` / `nextVideo` on the **session** room. The API MUST hydrate `videoId` server-side before queue or play. The API MUST NOT accept a client-supplied video DTO. Hydrate MUST be at most one search-then-match plus one embed check and MUST NOT call TikTok search, playlist fetch, or related. The API MUST `publishToRoom` so live WebSocket clients receive `roomUpdate`.

#### Scenario: Queue after search

- **WHEN** a valid session for room `4821` posts `/url-commands/queue` with a hydratable `videoId` and a fresh `once`
- **THEN** the room queue or `playingNow` MUST include that video
- **AND** connected TV/remote sockets MUST receive a room update

#### Scenario: Unresolved videoId refused

- **WHEN** hydrate cannot resolve the `videoId`
- **THEN** the API MUST NOT mutate the queue

### Requirement: HTTP mutations consume once in Redis per room

`queue`, `play`, and `next` over HTTP MUST require `once` (8–64 `A-Za-z0-9_-`). The consume key MUST be `once:http:{sessionRoomId}:{token}`. The API MUST consume that token after the bind confirm and before hydrate. A later HTTP call with the same `once` in that room MUST NOT apply a second mutation and MUST NOT call hydrate. Optional `exp` in the past MUST reject the call.

#### Scenario: Replay once is a no-op mutation

- **WHEN** `once=abc12345` was already consumed for an HTTP queue on room `4821`
- **AND** the same session posts `/url-commands/queue` again with `once=abc12345`
- **THEN** the API MUST NOT add a second copy of the video
- **AND** MUST NOT call search or embed

#### Scenario: Missing once

- **WHEN** `/url-commands/queue` is posted without `once`
- **THEN** the API MUST NOT mutate the room

#### Scenario: Same once string in another room is not a cross-room consume

- **WHEN** `once=abc12345` was consumed on session room `4821`
- **AND** a different session for `9999` posts queue with `once=abc12345`
- **THEN** the API MUST NOT mutate room `4821`

### Requirement: HTTP refuses host-destructive verbs

The HTTP room-control surface MUST NOT implement `closeRoom`, `lockRoom`, `unlockRoom`, `kick`, `promote`, `demote`, `clearQueue`, `clearHistory`, or `claimHost`. Even if the participant row is later `role: host`, those verbs MUST remain WebSocket-only.

#### Scenario: No HTTP clearQueue

- **WHEN** a client posts a body or path that asks to clear the queue over HTTP room-control
- **THEN** the API MUST NOT clear the queue

### Requirement: Agents are never assigned host

A join with `isAgent: true` (HTTP session or WebSocket `agent=1` / `joinToken`) MUST leave the participant as `role: member` unless a human host later promotes them on WebSocket. The API MUST NOT assign host when `hostDeviceId` is empty or missing, when the agent is the first remote in a TV-led room, or during stale prune.

#### Scenario: First agent in a TV-led room stays member

- **WHEN** a TV-led room has no remote co-host
- **AND** an agent session joins
- **THEN** the agent participant MUST have `role: member`
- **AND** MUST NOT receive host privileges

#### Scenario: Empty host slot does not crown the agent

- **WHEN** a room has no `hostDeviceId`
- **AND** an agent session joins
- **THEN** the agent MUST remain `role: member`

### Requirement: Snapshot omits secrets and device identity

`GET /url-commands/session` and session-create responses MUST NOT include the room password, WebSocket client ids, the server-generated agent `deviceId`, or other participants' `deviceId`s. `GET /session` MUST NOT return `sessionToken`. HTTP snapshots MUST NOT expose `hostDeviceId` as a joinable device id.

#### Scenario: Snapshot has no password

- **WHEN** a valid session fetches `GET /url-commands/session`
- **THEN** the body MUST include `hasPassword` when the room is protected
- **AND** MUST NOT include the password string, the agent `deviceId`, or `sessionToken`

### Requirement: Leave removes only the agent participant

`POST /url-commands/leave` with a valid session MUST delete that agent’s `session.deviceId` from the room and MUST invalidate the session token. It MUST NOT close the room, MUST NOT remove other participants, and MUST NOT run leave keyed on a human `deviceId`.

#### Scenario: Agent leave

- **WHEN** a session for display name `Claude` posts `/url-commands/leave`
- **THEN** `Claude` MUST no longer appear in the participant list
- **AND** the room MUST remain open if other clients are present

### Requirement: HTTP session and mutate are rate-limited

The API MUST refuse excess `POST /session` (5 per minute per IP, 20 per hour per IP), excess `queue` / `play` / `next` (10 per minute per session and 20 per minute per IP), and hydrate after YouTube circuit-open. A 429 or 503 MUST NOT mutate the room or call outbound search.

#### Scenario: Eleventh mutation in one minute

- **WHEN** one session has already applied 10 HTTP mutations in the last 60 seconds
- **AND** it posts `/url-commands/queue` again
- **THEN** the API MUST return 429
- **AND** MUST NOT hydrate or mutate
