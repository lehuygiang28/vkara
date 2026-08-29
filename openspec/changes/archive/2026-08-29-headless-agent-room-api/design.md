## Context

Room mutations are WebSocket-only today. `handleMessage` in `apps/api/src/modules/room/room-service.ts` is the dispatcher; `addVideo` / `playNow` / `nextVideo` require `validateClientInRoom(ws)` → Redis `client:{ws.id}.roomId`. No live mapping → `NOT_IN_ROOM`.

The v1 HTTP factory (`POST /url-commands/{validate,build-url,mint-once,mint-join-token}`) does **not** join, apply queue/play/next, or return room state. `mint-once` is a random string; consume happens in the **browser** (`packages/url-commands/src/consume.ts`). `llms.txt` Case B tells agents to search, mint `once`, `build-url`, then **open the URL** — that needs a tab that keeps `/ws`.

A second blocker: WS upgrade requires an allowed `Origin` when `CORS_ORIGINS` is set. Headless clients with no/wrong Origin get 403 even if they speak WebSocket.

Presence today: socket close prunes `connectionIds` but keeps the participant until stale prune (5 min unlocked / 24 h locked). Empty-room cleanup uses **in-process** `wsConnections`, not participant rows. First remote in a TV-led room is auto-promoted to co-host (`joinRoomInternal`). An HTTP agent that inherited that rule would become host.

Stakeholders: headless AI agents, browser agents, party guests, TV hosts. Guest path (QR, 4-digit code, no account) must stay short.

## Goals / Non-Goals

**Goals:**

- Headless agents can join a bound room and apply `queue` / `play` / `next` over HTTP.
- Same Redis room aggregate and embed/queue invariants as WebSocket.
- Agent visible in the participant list as `isAgent`, without a client WSS.
- Bind `{ roomId, displayName }` is a confirm check; the Redis session is the only room selector. Wrong bind refused without touching the claimed room.
- HTTP session always requires a password or `joinToken`. Room-id-only HTTP join is forbidden.
- HTTP `once` consumed in Redis (replay → no second mutation).
- `isAgent` never assigned host (empty host, first-remote, or prune).
- `llms.txt` documents HTTP Case A/B; factory + URL path stay for browser agents.

**Non-Goals:**

- Hidden / server-held WSS per agent.
- Host-destructive HTTP (`closeRoom`, `leaveRoom` as a host wipe, `lock`/`unlock`, `kick`, `promote`/`demote`, `clearQueue`/`clearHistory`, `claimHost`).
- HTTP create-room, volume, seek, captions, playlist import, layout/tab prefs.
- Streamable MCP JSON-RPC in this change (REST first; MCP can wrap later).
- Changing guest QR / share URL / `packages/room` invite builders.
- Returning server `deviceId` to the agent.
- Counting HTTP presence as a live client for empty-room TTL.

## Decisions

### D1 — HTTP commands, not a ghost socket (Option C)

| Option | Gain | Give up |
|---|---|---|
| **C. HTTP session + extracted room functions (chosen)** | Works on any API instance; Redis is SoT; reversible; no process-local fake `ElysiaWS` | Must extract WS-coupled handlers; agents poll for state |
| A. Factory only | Zero risk | Headless still cannot operate a room |
| B. Server-held WSS | Reuse `validateClientInRoom` as-is | `wsConnections` is in-process; crash/TTL/sticky; still a ghost socket (rejected for v1) |
| D. Short-lived WSS per request | No long-lived socket | `joinToken` single-use; presence flicker; first-remote-host landmines |
| E. HTTP + SSE now | Live updates | Second push transport; defer |

**Rationale:** Room is already a Redis aggregate. WSS is a delivery adapter that today also *authorizes* via `client:{wsId}`. Split: **auth = agent session**, **mutation = existing functions**, **fan-out = `publishToRoom`**.

### D2 — Routes stay under `/url-commands`

```
POST /url-commands/session   { bind, password?, joinToken? } → { sessionToken, exp, bind, room }
GET  /url-commands/session   Authorization: Bearer <sessionToken> → { bind, room }
POST /url-commands/queue     { bind, sessionToken, videoId, once, exp? }
POST /url-commands/play      { bind, sessionToken, videoId, once, exp? }
POST /url-commands/next      { bind, sessionToken, once, exp? }
POST /url-commands/leave     { bind, sessionToken }
```

Explicit verbs. `q` / `tab` / `layoutMode` stay URL-only (browser UI). Prefix keeps factory + bind + docs on one surface.

Search stays `POST /search` and `POST /tiktok/search` (do not re-invent).

### D3 — Agent session in Redis, generated deviceId never echoed

`agent-session:{token}` → `{ roomId, deviceId, displayName }`, TTL **30 min sliding**.

**Do not** copy WebSocket `joinRoom`. Passwordless 4-digit join is a living-room door (Origin-gated). HTTP is a global RPC.

`POST /session` MUST include exactly one capability:

- `joinToken` consumed with **`bind.roomId`** (`consumeJoinToken` already restores on mismatch), or
- `password` that matches a room that **has** a password.

Room-id-only (passwordless, no token) MUST fail. Wrong token / wrong password / missing room / locked-unknown MUST share one status and one code (no `ROOM_NOT_FOUND` vs `INCORRECT_PASSWORD` oracle).

`joinToken` still single-use: it creates the session; the session token is the replayable credential. Session row MUST NOT change `roomId` after create. Absolute session max **60 min** in addition to 30 min sliding idle.

Anonymous HTTP `mint-join-token` MUST refuse passwordless rooms (same opaque error). Otherwise mint is a free capability printer for every live open room (`mintBoundJoinToken` today mints public rooms with no secret). Bootstrap: a **current WebSocket participant** mints (host-only is enough). Invite copy in Settings MAY include that token for open rooms. QR / `vkara:roomId` stay 4-digit.

Server generates high-entropy `deviceId` (same class as `generateOnceToken`). **Do not** accept or return it.

Every command: session exists → `bind.roomId === session.roomId` → then `once` / hydrate / mutate. Bind mismatch MUST NOT load or `mutateRoom` the bind-claimed id, MUST NOT consume `once` or `joinToken`. **MUST NOT** take room id from path, query, or extra headers.

### D4 — Presence: listed, not “connected”

Join upserts participant: `isAgent: true`, `isTvConnection: false`, `connectionIds: []`, name from bind.

Each HTTP call refreshes `lastSeen`. Do **not** put a fake id in `room.clients` / `wsConnections`. Empty-room cleanup still uses live WSS only.

Idle > 5 min (unlocked): row may vanish; next valid session command re-upserts. `leave` deletes **only** this agent’s `session.deviceId` and the session key.

HTTP snapshot MUST omit password, ws ids, agent `deviceId`, and **SHOULD** omit all `participants.*.deviceId` and raw `hostDeviceId` (`cleanUpRoomField` still emits those for WS remotes). `youAreHost` on HTTP is always false.

### D5 — Never auto-host `isAgent`

`isAgent` MUST skip **every** host path, not only first-remote: empty/missing `hostDeviceId` (today 370–373 still promotes), TV-led first remote (381–396), and stale-prune (`promoteHostAfterStalePrune` only considers live `connectionIds` — keep HTTP out of `room.clients` / `wsConnections`). Agents stay `role: 'member'` unless a human later promotes them on WSS. HTTP still cannot lock/kick even if that row is later host.

### D6 — HTTP `once` is Redis `SET NX`

URL path: unchanged (browser `sessionStorage` + `localStorage`).

HTTP path: require `once` (8–64 `[A-Za-z0-9_-]`). Key **MUST** be `once:http:{sessionRoomId}:{token}` (`SET NX EX 600`). A global `once:{token}` MUST NOT ship — an attacker-chosen 8-char token could be burned across every room. Replay → 409 **before** hydrate. Honor `exp` if present.

`mint-once` can stay a generator; HTTP `SET NX` is enough. Persisting minted tokens so only minted ones work is a later tightening.

### D7 — Server-side hydrate

Browser URL path hydrates via `hydrateVideoById` (search-then-match). HTTP MUST hydrate on the server the same way, then run existing embed + queue invariants. No new public `GET /video/:id` unless search-then-match proves flaky.

### D8 — REST first, MCP later

There is no Streamable MCP server today (`mcp-remote` pointed at `/validate`). Ship REST. Cursor tools can wrap the same routes later.

### D9 — Cross-room and cost guardrails

| Bucket | Limit | On trip |
|---|---|---|
| `POST /session` | 5 / min / IP (burst 3), 20 / hour / IP | 429, no session, no upsert |
| HTTP `mint-join-token` | 5 / min / IP; passworded rooms only | 429 / opaque refuse |
| WS `mintJoinToken` | 10 / min / room | 429 to that socket |
| `queue` / `play` / `next` | 10 / min / session **and** 20 / min / IP | 429, no hydrate |
| Hydrate | 1 search + 1 embed after authz; 3s timeout; **0** retries on 429/5xx | fail closed |
| Hydrate cache | `hydrate:{videoId}` TTL 600s | skip InnerTube |
| YouTube circuit | ≥5 outbound 429/5xx/timeout in 30s | 60s HTTP queue/play 503 |
| Session | 30 min sliding idle, **60 min absolute** | 401; new joinToken required |
| Concurrent sessions | 8 / room, 4 / IP | 429 |

Authz order: session exists → bind matches session → `SET NX` once → hydrate → mutate.

Hydrate is read-only w.r.t. other rooms. No client-supplied video DTO. No TikTok / playlist / related fan-out. Unresolved id MUST NOT mutate; `once` may already be spent (fail closed). `next` MUST share `advanceInFlightByRoom`.

Rate-limit identity: prefer `requestIP` unless the request is actually from Cloudflare. Do not trust spoofable `CF-Connecting-IP` alone.

`POST /leave` deletes only `session.deviceId` and the session key. MUST NOT run `leaveCurrentRoom` against a colliding human device id.

Logs MUST NOT print `sessionToken`, `joinToken`, password, or `Authorization`. `llms.txt` uses placeholders only.

**Accepted in-room vandalism** (invited capability): queue/play/next up to caps; cleaned snapshot; `isAgent` in the list. **Refused even in-room:** host verbs, host assignment, other rooms, leaving anyone else, hydrate fan-out.

## Risks / Trade-offs

- [Headless agents poll, no `roomUpdate`] → `GET /session` snapshot; live TVs/phones still get WSS fan-out.
- [Agent listed but room still expires if TV/phones leave] → Documented. Agents must not pin empty rooms.
- [Session valid after panel prune] → Re-upsert on next command; 30 min session vs 5 min lastSeen.
- [Play/next interrupts the party] → Same as URL commands; `llms.txt` says confirm when the user did not ask to skip/play-now.
- [Extracting WS handlers regresses remotes] → Thin WS adapter; same unit tests call extracted functions.
- [Tighter mutation rate limit needed] → D9 buckets; global 20/s is a ceiling, not the control plane.
- [Password / joinToken in invite paste] → Only accepted on `POST /session`; never logged; never in later bodies.
- [Passwordless HTTP join copies WS] → Forbidden. 4-digit is not a bearer token.
- [Anonymous mint on open rooms] → Forbidden on HTTP; WS in-room mint only.
- [Global `once:{token}`] → Namespaced `once:http:{roomId}:{token}`.
- [YouTube reputation bomb] → hydrate cache + circuit + 0 retries; refuse, do not scrape TikTok.

## Migration Plan

1. Extract `addVideo` / `playVideoNow` / `nextVideo` / agent-aware upsert to functions that take `{ roomId, deviceId }` + broadcast.
2. Skip first-remote co-host when `isAgent` (WS + HTTP).
3. Add session + command routes. Feature-flag if needed.
4. WS `handleMessage` becomes a thin adapter.
5. Update `llms.txt` and `docs/agents/mcp.md`. Factory unchanged.
6. Rollback: unmount routes or flag off. URL + WSS + factory keep working.

## Open Questions

Resolved defaults for this change:

| # | Question | Default |
|---|---|---|
| 1 | Presence in the panel? | Yes, `isAgent`, lastSeen, empty `connectionIds`. Do not keep the room alive. |
| 2 | Session TTL? | 30 min sliding idle **and** 60 min absolute. |
| 3 | Hydrate-by-id? | Server search-then-match. |
| 4 | Auto-promote first remote if agent? | Never assign host for `isAgent` (empty host, first-remote, prune). |
| 5 | Generic `POST /apply` vs verbs? | Verbs. |
| 6 | Allow HTTP play / next? | Yes (same as URL). |
| 7 | Persist `mint-once`? | Not required; HTTP `SET NX` on `once:http:{roomId}:{token}`. |
| 13 | HTTP join = WS join? | **No.** Password or joinToken required. |
| 14 | HTTP mint on open rooms? | **Refuse.** WS participant mints. |
| 8 | Return `deviceId`? | No. |
| 9 | MCP protocol vs REST? | REST first. |
| 10 | Prefix? | `/url-commands`. |
| 11 | Fix WS agent co-host in this change? | Yes. |
| 12 | Confirm UI when URL join switches rooms? | Out of scope. HTTP never switches rooms. |
