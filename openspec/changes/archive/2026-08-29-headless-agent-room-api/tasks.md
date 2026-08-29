## 1. Extract room commands from WebSocket

- [x] 1.1 Extract `addVideo` / `playVideoNow` / `nextVideo` to functions that take `{ roomId, deviceId }` and `publishToRoom` (no `ElysiaWS` required)
- [x] 1.2 Keep `handleMessage` as a thin adapter: `validateClientInRoom` then call the extracted functions
- [x] 1.3 Skip every host assignment when `isAgent` is true (empty host, first-remote, prune; WebSocket and HTTP)
- [x] 1.4 Unit tests: existing queue/play/next still work via extracted functions; agent join stays `role: member` in a TV-led room

## 2. Agent session store

- [x] 2.1 Redis `agent-session:{token}` → `{ roomId, deviceId, displayName }` with 30 min sliding idle and 60 min absolute max
- [x] 2.2 `POST /url-commands/session` requires `joinToken` (consumed with `bind.roomId`) or a password on a passworded room — never roomId-only
- [x] 2.3 Generate high-entropy `deviceId` server-side; never echo it; upsert participant `isAgent: true`, `connectionIds: []`
- [x] 2.4 Session MUST NOT add a fake id to `room.clients` / `wsConnections`
- [x] 2.5 `GET /url-commands/session` returns `cleanUpRoomField` snapshot + bind; no password, no ws ids, no deviceId
- [x] 2.6 `POST /url-commands/leave` deletes that participant and invalidates the token
- [x] 2.7 Tests: password join, joinToken single-use, passwordless roomId-only refused, wrong password === missing room, snapshot redaction, leave

## 3. HTTP queue play next

- [x] 3.1 Server-side hydrate-by-id (search-then-match), then call extracted `addVideo` / `playVideoNow`
- [x] 3.2 `POST /url-commands/queue|play|next` require session + matching `bind.roomId` + `once`
- [x] 3.3 Redis consume `SET NX EX 600` on `once:http:{sessionRoomId}:{token}`; replay → 409 before hydrate; honor `exp`
- [x] 3.4 Refresh `lastSeen` on each successful command; re-upsert if the row was pruned
- [x] 3.5 Rate-limit mutations (10 / min / session) in addition to the global IP limit
- [x] 3.6 Tests: queue happy path + `publishToRoom`; unresolved id; wrong-room bind does not consume `once`; missing/replay `once` (zero hydrate); expired `exp`

## 4. Hard refusals

- [x] 4.1 Do not mount HTTP handlers for lock/kick/close/clear/claim/promote/demote
- [x] 4.2 Do not accept client `deviceId` on session or command bodies
- [x] 4.3 Tests: destructive paths are 404/refuse and do not mutate; HTTP host-row still cannot clear/kick

## 5. Docs and llms.txt

- [x] 5.1 Update `llms.txt` Case A/B: headless join = `POST /session`; Case B = search then HTTP queue; keep URL path for browsers
- [x] 5.2 Update `docs/agents/mcp.md` with session + command table; factory table unchanged
- [x] 5.3 Tests: `buildLlmsTxtContent` includes HTTP session/queue endpoints for the live API origin

## 6. Verify

- [x] 6.1 API unit tests for session + commands without a real WebSocket client
- [x] 6.2 Existing URL-command / factory / WS join tests still pass
- [x] 6.3 `bun run ci` (or equivalent package test + typecheck + lint) green

## 7. Cross-room and cost guardrails

- [x] 7.1 HTTP `mint-join-token` refuses passwordless rooms with the same opaque error as a missing room
- [x] 7.2 Add WebSocket `mintJoinToken` for a current participant (host-only is enough) so open rooms can invite headless agents
- [x] 7.3 Settings invite copy includes `joinToken` for passwordless rooms; QR / compact payload stay 4-digit only
- [x] 7.4 Room selector is Redis session only; path/query/header room ids never mutate; session `roomId` is immutable
- [x] 7.5 Concurrent session caps (8 / room, 4 / IP); session-create 5/min and 20/hour per IP
- [x] 7.6 Hydrate: 3s timeout, 0 retries on 429/5xx, cache `hydrate:{videoId}` 600s, YouTube circuit (≥5 failures / 30s → 60s 503)
- [x] 7.7 Tests: sweep fixture of passwordless rooms cannot HTTP-session; stolen session cannot mint another room; empty `hostDeviceId` does not crown the agent; 11th mutation / min is 429 with no hydrate; logger spy has no bearer/joinToken/password
