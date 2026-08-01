## Context

`/tv` is a dedicated 10-foot player (Tizen / Chrome 85 class GPUs). Audits found jank from two layers:

1. **Render architecture** — `WebSocketProvider` subscribes to `lastMessage` and puts it in context `useMemo` deps, so every WS message re-renders the provider and all `useWebSocket()` consumers. `youtubeStore` persist writes the full `room` (via `...rest`) on high-churn updates. Full `roomUpdate` object replacement invalidates memoized embed props when only incidental fields change.
2. **Paint / motion** — `backdrop-filter`, `filter: drop-shadow`, layout-animating queue shelf (`max-height` / `aspect-ratio`), progress `width` animation, and QR canvas resize on chrome reveal are expensive over a full-bleed iframe.

`TvPage` already handles room messages via `useWebSocketStore.subscribe` (good). Laptop `youtube/index.tsx` still consumes `lastMessage` from context.

Constraints: keep Norigin spatial nav, chrome mounted while playing, corner QR always available, TV recovery / rejoin secrets, YouTube TV accent `#3ea6ff`.

## Goals / Non-Goals

**Goals:**

- Steady playback with controls hidden: near-zero React commits from WS noise / persist.
- Control reveal, queue expand, settings, next-up: no multi-frame GPU hitches from blur/filters/layout animation.
- Preserve D-pad UX, rejoin, and visual brand (opaque “frosted” look without blur).

**Non-Goals:**

- Server-side play/pause + `roomUpdate` dedupe (follow-up).
- Full room state slicing into multiple zustand stores.
- Queue virtualization for very large queues (P2 follow-up).
- Lyrics / karaoke canvas (not on `/tv` path).
- Changing idle auto-hide timing or Back stack semantics.

## Decisions

### D1 — Split WS message side-effects from React context value

**Choice:** Keep recovery/session effects that need `lastMessage`, but stop putting `lastMessage` in the context value (or stop selecting it in the provider render path that rebuilds context). Prefer `useWebSocketStore.subscribe` / `getState()` inside effects for lifecycle handling; expose `lastMessage` to consumers via a narrow selector hook or direct store subscription (laptop page already can migrate like `TvPage`).

**Why not:** Only memoizing `children` — context consumers (`usePlayerAction` → many TV controls) still re-render when value identity changes.

**Alternative considered:** Separate `WebSocketMessageBridge` child that reads `lastMessage` and runs effects — also valid; use if splitting context value is awkward. Prefer removing `lastMessage` from context first.

### D2 — Persist only cold session fields from `youtubeStore`

**Choice:** `partialize` persists room identity needed for reload/rejoin (e.g. `room.id`, optional legacy password if still required) plus layout prefs (`layoutModeSource`, non-auto `layoutMode`), not live `currentTime`, full `videoQueue`, `participants`, or playback-volatile fields. Rejoin password remains primarily in `roomRejoinSecretStore`.

**Why not:** Debounce-only persist — still writes large JSON and can hitch on Tizen under burst updates.

**Verify:** `tv-room-recovery` + reload rejoin paths still restore a room session.

### D3 — Stabilize embed boundary by id + primitives

**Choice:** Host selects `playingNow` for load/caption logic as today when id changes; pass to `PlayerEmbedSurfaceMemo` props that are stable when id is unchanged (id string, booleans, numbers). Avoid new object references from parent re-renders for callbacks (`useCallback`) already present.

**Why not:** Deep-equal custom memo on full `YouTubeVideo` — heavier and easy to get wrong; id + primitives is enough for the media plane.

### D4 — TV paint budget: opaque overlays, transform-only motion

**Choice:** On `[data-tv-route]`:

- Replace `backdrop-filter` with high-opacity solid/gradient scrims.
- Remove QR / countdown `filter: drop-shadow`; use static plate/border.
- Fixed QR canvas pixel size; expand via CSS `transform: scale` if product still wants grow.
- Queue shelf: no animating `max-height` / thumb `height` / `aspect-ratio`; peek/expand via `translateY`/`opacity` or instant.
- Progress: `scaleX` + thumb `translateX`; drop width transition / glow.
- Focus: prefer border/outline rings over large soft halos on TV tokens.
- Queue focus scroll: `behavior: 'auto'`.

**Why not:** `will-change` everywhere — permanent promotion wastes memory on TV.

## Risks / Trade-offs

- **[Risk] Persist narrowing breaks reload rejoin** → Mitigation: keep `room.id` (+ secret store); add/adjust unit tests around `partialize`/`merge` and TV recovery.
- **[Risk] Removing `lastMessage` from context breaks laptop consumers** → Mitigation: migrate `youtube/index.tsx` to store subscribe (mirror `TvPage`); grep for `useWebSocket().lastMessage`.
- **[Risk] Instant queue expand feels abrupt** → Mitigation: short opacity/`translateY` (≤220ms) without layout animation; keep peek concept.
- **[Risk] Opaque scrims look flatter than blur** → Mitigation: denser gradient stops / higher opacity; keep accent focus plates.
- **[Trade-off] Chrome stays mounted when hidden** → Keep for D-pad latency; only reduce paint cost of hidden layers (no blur; progress already unmounts).

## Migration Plan

1. Land architecture P0 (WS isolation + persist + embed stability) with tests.
2. Land TV CSS/component paint fixes in the same change (low risk, visual).
3. Manual QA: idle playback → D-pad reveal/hide → queue expand → next-up → settings → phone remote play/pause → reload rejoin on `/tv`.
4. Rollback: revert PR; no data migration beyond persist shape (older persisted rooms still `merge`-normalize).

## Open Questions

- Exact persist whitelist: `room.id` only vs small cold snapshot (`playingNow` meta without `currentTime`)? Prefer **id-only + secret store** unless product needs offline “last song title” without network.
- Whether laptop player column should get the same scrim rules (no — scope is `[data-tv-route]` / dedicated TV components only).
