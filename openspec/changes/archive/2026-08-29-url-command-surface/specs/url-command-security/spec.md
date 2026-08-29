## ADDED Requirements

### Requirement: Mutations require matching roomId

`queue`, `play`, and `next` MUST include a valid `roomId`. The client MUST apply those acts only when the live session `room.id` equals that `roomId` after the room session is ready. A mismatch MUST refuse the act and MUST NOT implicitly join another room to satisfy it. Join remains the only operation that may switch rooms.

#### Scenario: Act on the bound room

- **WHEN** the live room id is `4821` and the command has `roomId=4821&queue=abc&once=token1`
- **THEN** the client MAY send `addVideo` after hydrate

#### Scenario: Refuse wrong-room act

- **WHEN** the live room id is `1111` and the command has `roomId=2222&play=abc&once=token2` without a successful join to `2222` in that same apply
- **THEN** the client MUST NOT send `playNow` against room `1111`

#### Scenario: Missing roomId on act

- **WHEN** the query contains `queue=abc&once=token3` and no `roomId`
- **THEN** the client MUST NOT send `addVideo`

### Requirement: Apply-once for room mutations

Any command that includes `queue`, `play`, or `next` MUST include `once`. The client MUST persist consume of that token (per tab and cross-tab) **before** sending the WebSocket mutation. A later apply of the same `once` MUST skip the mutation. Optional `exp` (unix seconds) MUST reject the one-shot if the current time is after `exp`.

#### Scenario: Refresh does not re-queue

- **WHEN** `once=abc12345` was already consumed in this browser profile
- **AND** the same query is applied again (refresh or second tab)
- **THEN** the client MUST NOT send a second `addVideo` or `playNow` or `nextVideo` for that token

#### Scenario: Missing once

- **WHEN** the query contains `roomId=4821&queue=abc` and no `once`
- **THEN** the client MUST NOT send `addVideo`

#### Scenario: Expired exp

- **WHEN** `exp` is in the past
- **THEN** the client MUST NOT apply `queue`, `play`, or `next`

### Requirement: Password is stashed before it is stripped

The client MUST copy `password` or `joinToken` into the existing pending-rejoin secret path before removing those keys from the address bar. The client MUST NOT strip invite `password` solely because persist rehydrated a matching `room.id` before `joinRoom` / `roomJoined`. After stash, the client MUST `replace` the URL without `password` and without `joinToken`. After `roomJoined` for the invite `roomId`, the client MUST strip `roomId` as well.

#### Scenario: Persist hydrate does not drop password before join

- **WHEN** persist has cold `room.id=4821` and the URL is `?roomId=4821&password=secret` and WebSocket has not yet sent `joinRoom`
- **THEN** the client MUST still have `secret` available for that join (vault or memory)
- **AND** MUST NOT rely on the address bar remaining the only copy

#### Scenario: Failed join keeps roomId for lobby

- **WHEN** join fails (not found, bad password, locked)
- **THEN** the client MUST strip `password` and `joinToken` and one-shot keys
- **AND** MUST keep `roomId` so the join lobby can stay filled

#### Scenario: joinToken wins

- **WHEN** both `joinToken` and `password` are present
- **THEN** the client MUST authenticate the join with `joinToken` and MUST ignore `password`

### Requirement: Secrets and identity never exported on command URLs

Command builders and share builders MUST NOT write `deviceId`, the rejoin-secret map, or host-destructive verbs into a URL. The parser MUST ignore those keys if present and MUST NOT execute `closeRoom`, `leaveRoom`, `lockRoom`, `unlockRoom`, `kickParticipant`, `promote`, `demote`, `clearQueue`, `clearHistory`, or `claimHost` from the query string.

#### Scenario: Destructive query is a no-op

- **WHEN** the query contains `closeRoom=1` or `clearQueue=1`
- **THEN** the client MUST NOT close the room or clear the queue from that parse

#### Scenario: deviceId query ignored

- **WHEN** the query contains `deviceId=anything`
- **THEN** the client MUST keep using the existing local device id
- **AND** MUST NOT send the query value as `deviceId`

### Requirement: Agent policy requires a display name for mutations

When `agent=1` is present, or when `queue` / `play` / `next` is present, a non-empty clamped `name` MUST be applied before join. If `name` is missing under that policy, the client MUST refuse the mutations. MCP callers MUST send `name` on mutating command URLs.

#### Scenario: Agent mutation without name

- **WHEN** the query contains `agent=1&roomId=4821&queue=abc&once=zz` and no `name`
- **THEN** the client MUST NOT send `addVideo`

#### Scenario: Human invite without name

- **WHEN** the query is only `roomId=4821&password=secret`
- **THEN** the client MUST join using the existing auto device label if the user has no stored display name

### Requirement: Open-redirect and external bases are rejected

Command URL builders MUST emit only same-app paths `/`, `/en`, `/tv`, `/en/tv` (plus locale equivalents already supported by middleware). The builder MUST NOT accept an agent-supplied base URL that is not the configured app origin.

#### Scenario: No open redirect param

- **WHEN** the query contains `redirect=https://evil.example` or `next=https://evil.example`
- **THEN** the client MUST NOT navigate off the app origin as a result of parsing those keys
