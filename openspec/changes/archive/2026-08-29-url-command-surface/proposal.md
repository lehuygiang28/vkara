## Why

vkara already uses URLs for room invites (`?roomId=` / `?password=`) and a dedicated `/tv` path, but almost every other action — layout mode, search, karaoke, provider, display name, queue/play — lives only in the UI. Agents and power users cannot script a join-and-act flow without clicking. The old `?layoutMode=` apply path was removed while the key is still stripped, and `router.replace(pathname)` after join wipes the entire query (including future commands and TV `launch=`), which will race any richer URL surface.

## What Changes

- Add an **optional** URL/query command document: unknown keys ignored; missing keys mean “do nothing.” Human QR invites stay `roomId` + optional `password`.
- Apply commands when present (join, layout, search, karaoke, provider, tab, display name, one-shot queue/play/next), then **selectively strip consumed keys** so refresh/back cannot duplicate side effects.
- Restore `layoutMode` apply on locale home only; `/tv` remains path-authoritative and ignores layout/search/tab query.
- Require `roomId` match for room-mutating one-shots; refuse acting on the wrong live session. Join remains the only room switch.
- Agents MUST set `name` when mutating or when `agent=1`. Apply name **before** the first `joinRoom` so participants are not labeled `Remote` / `TV`.
- Add apply-once tokens (`once`) for mutations; consume before send; persist consume so refresh cannot re-queue.
- Stash invite password before any strip; do not drop `password` until it is in the rejoin vault or join has failed in a defined way. Never put `deviceId` or the rejoin-secret map in a URL.
- Additive `joinToken` for agent-minted one-time joins (MCP/API); human QR keeps `password`.
- Shared parser/serializer in a new domain package; web adapter applies through existing Zustand/WS hooks.
- Docs: URL recipe reference + MCP connect snippet. MCP v1 is a URL factory + search + token mint (same schema); sessionful in-tab apply is v2.
- **Not breaking:** existing invite URLs and compact `vkara:` QR payloads keep working. Share builder stays invite-only unless callers opt into command params.

## Capabilities

### New Capabilities

- `url-command-surface`: Parse, apply, and selectively strip optional query/path commands (identity, session prefs, one-shot acts). Catalog, apply order, `/tv` vs locale home, unknown-key policy.
- `url-command-security`: Room-target match, password/joinToken handling, never-in-URL list, apply-once / consume, no destructive URL verbs, referrer/history hygiene.
- `agent-mcp`: MCP tools that share the command schema: validate, build URL, search, mint `joinToken`/`once`, bind `displayName` + `roomId`. v1 does not silently drive “whatever room the tab has.”

### Modified Capabilities

- `monorepo-package-boundaries`: Domain package `@vkara/url-commands` (parse/serialize/idempotency ids) may be added; validators hold the command Zod schema; apps remain adapters.

## Impact

- **New:** `packages/url-commands`, `packages/validators` URL-command schema, `apps/web` apply hook (replaces nuclear strip in `use-strip-room-query.ts`), docs under `docs/agents/`, MCP entry (`apps/api` Streamable HTTP and/or `packages/mcp` stdio).
- **Touched:** `WebSocketProvider` invite join reads the command document (not raw `get('roomId')`); `RemoteJoinLobby` prefill; `getEffectiveLayoutMode` must honor source `'url'` for the session; `buildShareableRoomUrl` stays invite-only; optional `buildCommandUrl`.
- **API:** optional `mintJoinToken` (Redis TTL) for MCP/agents.
- **Unchanged:** WS `ClientMessage` shapes; host-destructive actions stay UI/MCP-with-confirm only; Tizen/Android `launch=` must survive strip.
- **Related research:** [UX](ddb63043-bcfd-45e5-a325-a32a1ba519de) (param groups, TV silent apply, docs IA), [Software Architect](f47a1846-68ce-42a5-a3a7-f6b51c22e635) (bounded contexts, ADRs, consume-then-strip), [Senior Developer](b913fe39-bccd-4d1d-bf23-68ec228b313e) (persist-vs-strip race, apply order, capability inventory).
