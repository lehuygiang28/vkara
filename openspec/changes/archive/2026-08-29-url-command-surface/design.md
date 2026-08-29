## Context

vkara is a shared karaoke room: one player (TV/laptop) and many remotes (phones). Identity and playback already travel over WebSocket (`ClientMessage` in `@vkara/validators`). The URL today is only an **invite**:

- Share/QR: `origin + /| /en + ?roomId=&password=` (`packages/room` `buildShareableRoomUrl`, `apps/web` `generateShareableUrl`).
- Apply: `WebSocketProvider.syncRoomSession` prefers invite `roomId` over persisted rejoin.
- Cleanup: `useStripRoomQueryFromUrl` waits for `room.id`, then `router.replace(pathname)` and deletes **all** query keys (`roomId`, `password`, `layoutMode` listed; `launch` and future keys die too).
- `?layoutMode=` used to apply (`setLayoutMode(..., 'url')`) and was removed; the strip key remains. `/tv` is the only live URL layout command (`useTvRouteBootstrap`).
- Search, karaoke, provider, display name, queue/play exist as stores/WS only. There is **no MCP**.
- Persist hydrate has no `hasHydrated` gate. Strip keys off `room?.id` (cold stub) can drop `password` **before** `joinRoom` runs.

Stakeholders: party guests (QR), TV hosts, AI agents/automation, self-hosters. Constraints: locale middleware (`/` = vi, `/en` = en), dedicated `/tv`, 10-foot spatial nav, existing QR payload (`vkara:roomId:password`), 4-digit guessable room ids.

## Goals / Non-Goals

**Goals:**

- Optional, forward-compatible query command document so a fully specified URL can join and act without extra UI.
- Apply-once + selective strip: no duplicate queue/play on refresh/back; TV `launch=` and unknown keys survive.
- Room-target security: mutations apply only when live `room.id` equals command `roomId`.
- Agent self-naming before first join; docs + MCP that share one schema.
- Password never left in the address bar after it is stashed; rejoin vault and `deviceId` never serialized into links.

**Non-Goals:**

- Putting host-destructive verbs (`closeRoom`, `kick`, `clearQueue`, `lock`, `leave`) in the URL.
- Headless MCP joining WebSocket as a hidden participant in v1.
- Replacing QR compact payload with a full command blob.
- Path-based commands (`/r/1234/play/...`) that fight `[locale]` + `/tv`.
- Accepting `deviceId` from the query.
- Making URL params mandatory for normal human use.
- Changing WS message shapes or YouTube/TikTok embed contracts.

## Decisions

### D1 — Query string is the command transport (v1)

| Option | Gain | Give up |
|---|---|---|
| **A. Query (chosen)** | Compatible with QR, `useSearchParams`, lobby prefill, `buildShareableRoomUrl` | Password/commands can hit HTTP logs / Referer |
| B. Path | Cleaner | Breaks locale + `/tv` rewrite; two invite formats |
| C. Fragment | Secrets not on first HTTP request | Next/SSR blind; some TV QR drop hash |
| D. Hybrid query + fragment password | Less log leak | Two parsers |

**Rationale:** Invite already is query. Parser is `URLSearchParams`-first. Migration to D remains possible without changing the typed document.

### D2 — Shared kernel: `@vkara/url-commands` + validators schema

Per `monorepo-package-boundaries` (apps → domain → platform):

```
packages/validators     urlCommandDocumentSchema (zod)
packages/url-commands   parse / serialize / consume-id / allowlist  (no React, no WS)
packages/room           invite URL + isValidRoomId only (do not grow into search/MCP)
apps/web                CommandApplicator ports → Zustand, WS, Next router
apps/api                mint joinToken; Streamable HTTP MCP (v1)
docs/agents             generated/copied catalog from zod, not a second list
```

**Rejected:** Growing `packages/room` into karaoke/search. A second parser in `apps/web`. Cloudflare Worker as the only MCP (no Wrangler app today; search + token mint already belong on the API).

### D3 — One command document, four groups

Unknown keys: **ignore**. Invalid values: **drop that key only**. Empty: omit.

| Group | Keys | When |
|---|---|---|
| Identity | `roomId`, `password?`, `joinToken?` | Join / bind. `joinToken` wins over `password` if both present |
| Session | `layoutMode`, `q`, `karaoke`, `provider`, `name`, `tab`, `agent` | Device/UI prefs |
| One-shot | `queue`, `play`, `next`, `once`, `exp?` | Room mutations; `once` required if any of queue/play/next |
| Reserved ignore | `launch` (TV shell), `mode` on `/e2e-recovery` only | Never consume |

**Path is identity too:** `/` vs `/en`; `/tv` vs `/en/tv`. Do **not** add `?locale=`.

**Canonical values:**

- `layoutMode`: `auto` \| `remote` \| `player` \| `both`
- `karaoke`: `0` \| `1`
- `provider`: `youtube` \| `tiktok`
- `tab`: `search` \| `queue` \| `history` \| `controls` \| `settings`
- `agent`: `1` means agent policy (name required)
- `queue` / `play`: platform video id (resolve to full `youtubeVideoSchema` via existing HTTP before WS)
- `next`: `1`
- `once`: opaque 8–64 char token
- `name`: trim, max 40 (same as display-name clamp)

**Not in URL:** `deviceId`, rejoin-secret map, `closeRoom`, `leaveRoom`, `lockRoom`, `unlockRoom`, `kick`, `promote`, `demote`, `clearQueue`, `clearHistory`, `claimHost`, `redirect`/`next` to other origins.

Human `generateShareableUrl` stays invite-only. Agents use `buildCommandUrl`.

### D4 — Apply pipeline (single hook, one snapshot)

Replace dual life of raw `searchParams` join + nuclear strip with `useApplyUrlCommands`.

```
parse snapshot (generation token)
  → validate (drop bad keys)
  → name first (setUserDisplayName) if present
  → stash password / joinToken into existing roomRejoinSecretStore
  → join via existing syncRoomSession (command.join, not get('roomId'))
  → session prefs: provider → karaoke → q → tab → layout†
  → wait isRoomSessionReady
  → refuse mutations if room.id !== command.roomId
  → consume `once` (sessionStorage + localStorage) THEN resolve vid THEN WS
  → selective strip of consumed keys (replace, never push)
```

† On `isDedicatedTvRoute`: ignore `layoutMode`, `q`, `tab`. Do not steal D-pad focus, open overlays, or toast on `/tv`.

**Apply order rationale:** name must precede `joinRoom` (`websocketStore` auto-fills `getDeviceLabel()` if omitted). Provider before karaoke/q because `setIsKaraoke` re-searches. Mutations last so session exists.

**Hydrate:** do not strip invite keys on persist cold `room.id` alone. Strip join keys only after `roomJoined` for that `roomId`, or after a defined join failure (then strip `password` / `joinToken` / one-shots; **keep** `roomId` for lobby prefill).

### D5 — Apply-once: nonce for mutations, intent hash for UI

| Layer | Key | Use |
|---|---|---|
| `once` | Agent/builder UUID | Required for `queue` / `play` / `next`. Consume **before** WS send |
| Intent fingerprint | Canonical hash of session prefs + roomId | Same-tab refresh must not re-run search/karaoke/layout |
| Join without `once` | None | `joinRoom` may retry until `roomJoined` |

Cross-tab: write consumed `once` to `localStorage` so two tabs cannot replay the same mutating link.

**Rejected:** nonce on every human QR (breaks `buildShareableRoomUrl`). Intent-hash-only for queue (two guests sharing the same add URL would collide).

### D6 — Selective strip, not `replace(pathname)`

`router.replace` with remaining `URLSearchParams`. Always allowlist-delete consumed keys.

**Keep:** `launch`, unknown keys, `roomId` after failed join.

**Always `replace`, never `push`.** Locale switch (`useChangeLocale` preserveSearchParams) must not re-attach stripped secrets — applicator snapshot wins over a live bar mid-apply.

### D7 — Room targeting

- Join **may** switch rooms (today’s invite). That is the only switch.
- `queue` / `play` / `next` **MUST** include `roomId` and apply only if `store.room.id === command.roomId` after session ready.
- Mismatch → hard fail, no implicit join-for-act.
- Locked room / bad password: existing join errors; do not retry mutations.

Human room-switch **confirm** is deferred (Open Question). v1 matches today’s QR auto-switch for join-only.

### D8 — `layoutMode` source `'url'` is a session override

- Query `layoutMode` on locale home → `setLayoutMode(mode, 'url')` or `enableAutoLayoutMode()` for `auto`.
- `getEffectiveLayoutMode` MUST treat `'url'` like `'user'` (today it falls through to viewport — a hole left when query apply was removed).
- Do **not** persist `'url'` as the cold `layoutModeSource` (same idea as `'auto'` merge). Next visit without query returns to auto/user.
- `/tv` keeps bootstrapping `'url'` each visit. Query `layoutMode` on `/tv` is ignored.
- Visiting `/tv` MUST NOT leak a sticky `'url'` host onto a later phone `/` visit (fix persist leak).

### D9 — Password vs joinToken

- Human invites: keep `?password=` (QR compatibility).
- Agents/MCP: mint `joinToken` (API + Redis TTL, single use). If `joinToken` present, ignore `password`.
- Rejoin secrets stay in `roomRejoinSecretStore` and are **never** exported into a link.
- After stash, strip `password`/`joinToken` from the bar even if join is still in flight — the in-memory/vault copy is the retry source.

### D10 — MCP v1 is a factory, not a ghost participant

```
Agent → MCP tools
  validate / build_url / docs     →  @vkara/url-commands
  search_videos / mint_join_token / mint_once →  apps/api
  (v2) apply_command              →  same ports as the web hook, mandatory roomId match
```

v1 connect: env `VKARA_WS_URL` or app origin, `VKARA_ROOM_ID`, optional password/token, `VKARA_DISPLAY_NAME`. First tool result echoes `{ roomId, displayName }` so the model cannot “help the wrong party.”

**Rejected for v1:** MCP opening a second WS as the TV’s `deviceId`.

### D11 — Feedback

- Phone: reuse `ActionFeedbackHost` / error toasts for acts; session prefs silent.
- `/tv`: silent success; join failure stays `tvLobbyBanner`. No Sonner, no `focus()`.

## Risks / Trade-offs

- **[Password already in QR/history]** → Strip after stash; referrer-policy on invite documents; docs tell agents to prefer `joinToken`; do not add password to `/tv` PWA start_url.
- **[GET is CSRF]** → Mutations require `once` + `roomId` match; consume immediately; no destructive verbs in the parser.
- **[4-digit roomId guessable]** → Password/lock remain the real gates; mutations still need live session match.
- **[Persist strip race (today)]** → Strip join keys only after `roomJoined` for the URL id, not on cold stub.
- **[Refresh before strip]** → Consumed `once` / intent hash skip re-apply.
- **[act=play interrupts the party]** → Documented; URL does not confirm (automation). MCP may offer dry-run later.
- **[queue/play need full video DTO]** → Hydrate via existing search/metadata HTTP; refuse if unresolvable; no half WS payload.
- **[TikTok without experiments]** → Ignore `provider=tiktok`; do not fail the rest.
- **[Same-profile agent overwrites human `vkara_display_name`]** → Document: use a dedicated profile or always pass `name` on a bot device.
- **[Two tabs, one deviceId]** → `once` in `localStorage`; each tab still checks its own `room.id`.

## Migration Plan

1. Land parser + tests with **zero** behavior change except: selective strip of current invite keys; **stop** stripping on persist id before `roomJoined`; preserve `launch`.
2. Apply `name`, then session prefs, then `layoutMode` on locale home; fix `'url'` effective-mode + persist leak.
3. Mutations + `once` + room match + video hydrate.
4. Docs. MCP v1 (build/validate/search/mint) behind a flag if needed.
5. Rollback: feature-flag the applicator; old invite path remains if parse yields only join fields.

## Open Questions

1. **Confirm UI when invite `roomId` ≠ current session** — safer on a living-room TV; breaks “scan a new QR while already in a room” (today auto-switches). Default v1: no confirm for join-only.
2. **Hydrate-by-id API** vs reuse search endpoints for `queue`/`play` — prefer a small existing metadata path if one exists; otherwise search-then-match.
3. **stdio `@vkara/mcp` vs API Streamable HTTP only** — implement API HTTP in this change; stdio wrapper is a thin client of the same tools if publish cost is low.
4. **`agent=1` without `name`** — fail the whole document vs apply join and refuse mutations. Chosen in specs: refuse mutations and skip auto-label overwrite; still join if `roomId` present, but MCP MUST send `name`.
