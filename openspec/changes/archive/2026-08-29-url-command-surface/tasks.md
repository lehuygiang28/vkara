## 1. Shared command kernel

- [x] 1.1 Add `@vkara/url-commands` workspace package (tsconfig from `tooling/typescript`; apps → domain deps only)
- [x] 1.2 Add Zod `urlCommandDocumentSchema` in `@vkara/validators` (identity, session, one-shot, reserved-ignore)
- [x] 1.3 Implement `parseUrlCommands` / `serializeUrlCommands` / `buildCommandUrl` (origin allowlist; unknown keys passthrough)
- [x] 1.4 Unit tests: valid invite, invalid `layoutMode` drop, unknown key keep, `joinToken` vs `password`, missing `once` on acts, `name` clamp 40, `exp` past

## 2. Safe strip (no behavior expansion yet)

- [x] 2.1 Replace nuclear `router.replace(pathname)` with selective key delete; always keep `launch` and unknown keys
- [x] 2.2 Do not strip `password` / `roomId` on persist cold `room.id` before `roomJoined` for that id
- [x] 2.3 After stash, strip `password` / `joinToken` from the address bar via `replace`; keep `roomId` until join success or defined failure
- [x] 2.4 Tests for strip: matching join, mismatch no-strip, failed join keeps `roomId`, `launch` survives

## 3. Applicator wiring

- [x] 3.1 Add `useApplyUrlCommands` with one snapshot/generation; wire on locale home and `/tv`
- [x] 3.2 Point `WebSocketProvider.syncRoomSession` and `RemoteJoinLobby` at the command document (not raw `get('roomId')`)
- [x] 3.3 Apply `name` via `setUserDisplayName` before any create/join/rejoin send
- [x] 3.4 Ignore `mode` on `e2e-recovery`; ignore `layoutMode` / `q` / `tab` on dedicated TV; no focus/toast on `/tv` apply

## 4. Session prefs and layoutMode

- [x] 4.1 Apply `provider` → `karaoke` → `q` → `tab` → `layoutMode` on locale home; gate TikTok on experiments
- [x] 4.2 Treat layout source `'url'` as override in `getEffectiveLayoutMode`; do not persist `'url'` as cold source
- [x] 4.3 Stop `/tv` bootstrap from leaking sticky `'url'` host behavior onto a later phone `/` visit
- [x] 4.4 Same-tab intent-hash so refresh does not re-run search/karaoke/layout
- [x] 4.5 Tests: phone `layoutMode=player`, `/tv` ignores `layoutMode=remote`, persist leak, karaoke+q order

## 5. One-shot mutations

- [x] 5.1 Require `roomId` + `once` for `queue` / `play` / `next`; consume token in sessionStorage + localStorage before WS
- [x] 5.2 Wait `isRoomSessionReady`; refuse if live `room.id` !== command `roomId`
- [x] 5.3 Hydrate video id to full DTO; refuse unresolvable ids; strip one-shot keys even on refuse
- [x] 5.4 Agent policy: `agent=1` or any act without `name` refuses mutations
- [x] 5.5 Tests: refresh no re-queue, wrong-room refuse, missing `once`, missing `name` on act, hydrate fail

## 6. Join token (API)

- [x] 6.1 Add mint + consume `joinToken` on `apps/api` (Redis TTL, single use, one `roomId`)
- [x] 6.2 Web join accepts `joinToken` and ignores `password` when token present
- [x] 6.3 Tests: replay fails; vault not exported; expired token fails

## 7. Docs

- [x] 7.1 Add `docs/agents/url-commands.md` + `docs/vi/url-commands.md` (catalog, apply order, `/tv` rules, recipes, security)
- [x] 7.2 Add `docs/agents/mcp.md` with Cursor MCP env snippet (`VKARA_ROOM_ID`, `VKARA_DISPLAY_NAME`)
- [x] 7.3 Link both from `docs/README.md` (and a single developer line in root README)

## 8. MCP v1

- [x] 8.1 Expose MCP tools on `apps/api` (or thin `packages/mcp` stdio wrapping the same): validate, `build_url`, search, `mint_once`, `mint_join_token`
- [x] 8.2 Bind/echo `{ roomId, displayName }`; refuse mutating build for a different `roomId`; refuse destructive URL verbs
- [x] 8.3 v1 MUST NOT join WS as a hidden participant using the browser/TV device id
- [x] 8.4 Tests: `build_url` round-trips through `parseUrlCommands`; wrong-room refuse

## 9. Verification

- [x] 9.1 Unit + hook tests green for parse, strip races, layout `'url'`, consume, room match
- [ ] 9.2 Manual: invite QR unchanged; agent URL join+name+search; `/tv?roomId=` silent; `launch=` kept; password gone from bar after stash
