## Why

`llms.txt` and the v1 URL-command factory only work if the agent can open the app and keep a WebSocket to `/ws`. Headless and API-only clients can search and mint URLs, but they cannot join or mutate a room. Agents that paste the invite line into Cursor (or any HTTP-only runner) hit that wall today.

## What Changes

- Keep `POST /url-commands/{validate,build-url,mint-once}` unchanged (no hidden WSS).
- Add an HTTP room session + command surface so an agent can join as `isAgent` and apply `queue` / `play` / `next` without a client browser socket.
- **HTTP is not WebSocket join.** Session create MUST require a room password or a `joinToken`. Room-id-only join (passwordless 4-digit) MUST NOT exist on HTTP — that would let a bot walk 0000–9999.
- Anonymous HTTP `mint-join-token` MUST refuse passwordless rooms (same opaque error as a missing room). In-room WebSocket mint is the bootstrap for open rooms.
- Mutation target room id MUST come only from the Redis session. `bind.roomId` is a confirm check, never the selector.
- Reuse the existing Redis room aggregate (`mutateRoom` + `publishToRoom`). Do not invent a second queue.
- Consume HTTP `once` in Redis namespaced by session room id. Browser URL consume stays as-is.
- Never assign host to `isAgent` (empty host, first-remote, or prune).
- Refuse host-destructive verbs on HTTP (`closeRoom`, `kick`, `lock`, `clearQueue`, `claimHost`, …).
- Cap session create, mint, hydrate, and mutations so one IP cannot scan rooms or burn YouTube.
- Update `llms.txt` Case A/B so headless agents join via HTTP session, then command; browser agents keep the URL path.
- Guest QR / 4-digit / `vkara:roomId:password` stay invite-only. No new guest UI.

## Capabilities

### New Capabilities

- `http-room-control`: capability-gated session (password or joinToken, never roomId-only); session-bound mutations; namespaced Redis `once`; opaque auth failures; rate/circuit limits; agent presence without a client WSS; no host-destructive verbs; no host assignment for agents.

### Modified Capabilities

- `agent-mcp`: v1 factory still MUST NOT open a hidden WebSocket as the TV/browser `deviceId`. HTTP `mint-join-token` MUST NOT print a token for a passwordless room. The deferred `apply_command` step becomes this HTTP surface (REST first). Tools that mutate MUST go through a capability-gated session, not a ghost socket.

## Impact

- **API:** additive routes under `/url-commands`; Redis keys for agent session and HTTP `once`; extract room command functions so they are not `ElysiaWS`-only.
- **Room service:** join upsert for agents with empty `connectionIds`; skip first-remote co-host when `isAgent`; `publishToRoom` still fans out to live TVs/phones.
- **Web / QR / TV:** no required guest-path change. `llms.txt` and `docs/agents/mcp.md` teach the HTTP path.
- **Not breaking:** existing invites, factory, WSS remotes, URL command apply in a real browser.
