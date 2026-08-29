# url-command-surface Specification

## Purpose

Optional URL/query command document for join, session prefs, and one-shot queue/play/next. Human QR invites stay invite-only.

## Requirements

### Requirement: Optional command document from the query string

The client MUST parse known URL query keys into a single command document. Missing keys MUST mean no-op for that field. Unknown keys MUST be ignored and MUST remain in the URL after apply. Invalid values MUST be dropped for that key only and MUST NOT fail other keys.

#### Scenario: Invite-only URL still joins

- **WHEN** the location is `/?roomId=4821&password=secret` with no other known command keys
- **THEN** the client MUST join room `4821` using `secret`
- **AND** MUST NOT require `once`, `name`, or session prefs

#### Scenario: Unknown key preserved

- **WHEN** the query contains `roomId=4821` and `foo=bar`
- **THEN** after successful join the client MUST strip `roomId` (and password if present)
- **AND** MUST keep `foo=bar` in the query

#### Scenario: Invalid layoutMode ignored

- **WHEN** the query contains `layoutMode=tablet` and `q=hello`
- **THEN** the client MUST NOT change layout mode from that key
- **AND** MUST still apply the search query `hello`

### Requirement: Reserved keys are not consumed as room commands

The client MUST NOT treat `launch` as a command. The client MUST NOT treat `mode` as a room command on `/e2e-recovery`. Locale MUST be path-only (`/`, `/en`, `/tv`, `/en/tv`); the client MUST NOT introduce `locale` as a query command.

#### Scenario: TV launch survives join strip

- **WHEN** a dedicated TV document loads `/tv?roomId=4821&launch=1710000000` and join succeeds
- **THEN** the client MUST remove `roomId`
- **AND** MUST keep `launch`

#### Scenario: E2E recovery mode isolated

- **WHEN** the path is a locale `e2e-recovery` page with `?mode=hard`
- **THEN** the room command applicator MUST NOT consume `mode`

### Requirement: Dedicated TV route ignores layout search and tab

On a dedicated TV route (`/tv` or `/:locale/tv`), the client MUST ignore `layoutMode`, `q`, and `tab`. The path remains the layout command (player). The client MUST NOT steal focus, open search/settings overlays, or show success toasts as a side effect of URL apply on that route.

#### Scenario: layoutMode on /tv is ignored

- **WHEN** the path is `/en/tv` and the query contains `layoutMode=remote`
- **THEN** the client MUST keep player-host layout for that document
- **AND** MUST still apply identity join keys if present

#### Scenario: Search query does not open TV overlay

- **WHEN** the path is `/tv` and the query contains `q=karaoke`
- **THEN** the client MUST NOT open a search overlay or move spatial focus

### Requirement: Session prefs apply on locale home

On locale home (`/` or `/:locale` that is not `/tv`), the client MUST apply valid session prefs after name (if any) and after password stash, in this order: `provider`, `karaoke`, `q`, `tab`, `layoutMode`. `provider=tiktok` MUST be ignored when experiments are disabled. `layoutMode=auto` MUST enable auto layout. Other explicit layout values MUST set layout with source `url` for the document session.

#### Scenario: Karaoke search on remote

- **WHEN** locale home loads `?q=son+tung&karaoke=1&provider=youtube`
- **THEN** the client MUST set karaoke on and perform search for `son tung` against YouTube

#### Scenario: TikTok provider gated

- **WHEN** `provider=tiktok` and experiments are disabled
- **THEN** the client MUST leave the effective provider as YouTube
- **AND** MUST apply remaining valid keys

#### Scenario: layoutMode applies on home

- **WHEN** locale home loads `?layoutMode=player` on a phone-width viewport
- **THEN** effective layout for that document MUST be `player`
- **AND** a later visit without `layoutMode` MUST NOT keep source `url` as the cold persisted source

### Requirement: Display name applies before the first join send

When `name` is present and non-empty after trim/clamp (max 40), the client MUST persist it via the existing user display-name store **before** sending `createRoom`, `joinRoom`, or `reJoinRoom`.

#### Scenario: Agent name on join

- **WHEN** the query contains `roomId=4821&name=Claude`
- **THEN** the first `joinRoom` payload MUST use display name `Claude` (clamped)
- **AND** MUST NOT fall back to an auto device label for that send

### Requirement: One-shot queue play and next wait for session and hydrate

`queue`, `play`, and `next` MUST wait until the room session is ready. `queue` and `play` MUST resolve the video id to a full queue-item DTO before sending WebSocket. Unresolvable ids MUST refuse that act and MUST NOT send a partial payload.

#### Scenario: Queue add after join

- **WHEN** locale home loads `?roomId=4821&queue=dQw4w9WgXcQ&once=k7n2m9ab` and join succeeds for `4821` and the id hydrates
- **THEN** the client MUST send `addVideo` with a full video object
- **AND** MUST consume `once` before that send

#### Scenario: Unresolvable video id

- **WHEN** `play` references an id the hydrate step cannot resolve
- **THEN** the client MUST NOT send `playNow`
- **AND** MUST still strip the one-shot keys so refresh does not loop

### Requirement: Apply order is name then join then prefs then acts

The applicator MUST use one parsed snapshot per navigation generation and MUST apply in this order: name → stash secrets → join → session prefs → wait session ready → one-shot acts → selective strip. The applicator MUST use `history.replace` and MUST NOT `push` command URLs.

#### Scenario: Snapshot ignores mid-apply bar edits

- **WHEN** the user or locale switch changes query keys while apply is in progress
- **THEN** the client MUST finish the original snapshot
- **AND** MUST NOT start a second apply until the first generation reaches idle

### Requirement: Human share URLs stay invite-only

`generateShareableUrl` / `buildShareableRoomUrl` MUST continue to emit only `roomId` and optional `password`. Compact `vkara:roomId:password` payloads MUST stay invite-only.

#### Scenario: QR does not encode acts

- **WHEN** the TV or settings UI builds a shareable URL
- **THEN** the URL MUST NOT include `queue`, `play`, `next`, `once`, `q`, or `layoutMode`

### Requirement: Command catalog is documented

The repository MUST publish an English URL-command reference (and a Vietnamese translation) that lists every supported key, apply order, `/tv` exceptions, security rules, and example recipes. The docs index MUST link to it.

#### Scenario: Recipe page exists

- **WHEN** a developer opens the agents URL-command docs
- **THEN** the page MUST include join, named-agent join, search+karaoke, one-shot queue add, and `/tv` path examples
