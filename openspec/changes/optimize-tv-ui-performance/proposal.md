## Why

The dedicated `/tv` player feels janky on Smart TV / Tizen-class devices: every WebSocket message can re-render the full React tree, zustand persist writes the hot `room` object to storage on churn, and TV overlays paint with GPU-expensive blur/filters and layout-animating CSS over a full-bleed video. Smooth 10-foot karaoke playback needs those costs removed without changing D-pad UX or brand.

## What Changes

- Isolate `WebSocketProvider` so `lastMessage` side-effects do not re-render `children` / context consumers on every inbound message.
- Narrow `youtubeStore` persist `partialize` so high-churn room fields (especially playback time and full live room snapshots) are not written to storage on every update; keep rejoin-safe session identity.
- Stabilize TV embed props so `PlayerEmbedSurfaceMemo` stays cold across `roomUpdate` identity churn when the playing video id is unchanged.
- Replace TV `backdrop-filter` / QR `drop-shadow` / countdown glow with opaque scrims and static plates.
- Freeze fixed corner QR canvas size (scale via CSS `transform` if needed); stop resize/redraw on chrome reveal.
- Drive queue peek/expand with composited motion (`opacity` / `transform`) instead of `max-height` / `aspect-ratio` / height animation.
- Drive playback progress fill/thumb via `transform` (`scaleX` / `translateX`), not layout `width` / `left`.
- Prefer cheaper TV focus rings and instant queue scroll (`behavior: 'auto'`).

## Capabilities

### New Capabilities

- `tv-ui-performance`: Requirements for smooth dedicated `/tv` UI — render isolation from WS message fan-out, persist bounds for room state, and TV paint/motion constraints over the media plane.

### Modified Capabilities

- (none — no existing capability specs cover `/tv` overlay performance)

## Impact

- `apps/web` only: `WebSocketProvider`, `youtubeStore` persist, TV page components (`tv-*`), `tv-tokens.css`, `tv-focus-styles`, playback progress hook/UI, QR components.
- TV recovery / rejoin (`tv-room-recovery`, `roomRejoinSecretStore`) must keep working after persist narrowing.
- No API/protocol changes required for the first slice; optional later dedupe of play/pause + `roomUpdate` is out of initial scope.
- Spatial navigation (Norigin) and chrome-mounted-while-playing behavior stay intact.
