# tv-ui-performance Specification

## Purpose
Keep the dedicated `/tv` player smooth on low-end Smart TV SoCs by isolating WebSocket fan-out, narrowing persist writes, stabilizing the media embed, and avoiding expensive overlay filters / layout-thrashing motion.
## Requirements
### Requirement: WebSocket context does not fan out every message

The dedicated TV player and other `useWebSocket` consumers MUST NOT re-render solely because a new inbound WebSocket message updated `lastMessage`. Room lifecycle side-effects (join/create recovery, fatal rejoin, room closed) MUST still run. Call sites that apply room state from messages MUST read messages via store subscription or an equivalent non-provider-wide fan-out path.

#### Scenario: Inbound message during idle playback

- **WHEN** the TV player is playing with controls hidden and a non-lifecycle WebSocket message arrives (for example `currentTimeChanged` that does not change store state)
- **THEN** the WebSocket context value used by transport/settings hooks MUST NOT force a full consumer re-render tree solely due to `lastMessage` identity change

#### Scenario: Lifecycle message still recovers the TV session

- **WHEN** the client receives a lifecycle message such as `roomClosed`, `kicked`, or a fatal rejoin error
- **THEN** the existing TV lobby / recovery behavior MUST still execute

### Requirement: Persisted youtube store excludes hot room fields

The `youtubeStore` persist layer MUST NOT write high-churn playback or full live room snapshots to storage on every room update. Persisted data MUST remain sufficient to rejoin a room after reload when a rejoin secret is available.

#### Scenario: Playback time advances

- **WHEN** room `currentTime` updates during playback
- **THEN** persist MUST NOT rewrite a full live room payload to storage as a result of that time-only change

#### Scenario: Reload rejoin still works

- **WHEN** the user reloads `/tv` after having joined a room with a stored rejoin secret
- **THEN** the client MUST still be able to rejoin that room session

### Requirement: Media embed stays cold when playing video id is unchanged

While the playing video id is unchanged, the TV media embed surface MUST NOT remount or reload solely because a `roomUpdate` replaced the room object reference or updated unrelated room fields.

#### Scenario: Queue or participants update during playback

- **WHEN** the room queue or participants change and `playingNow.id` is unchanged
- **THEN** the YouTube/TikTok embed MUST remain mounted without a track reload

### Requirement: TV overlays avoid expensive filters over video

On the dedicated TV route, overlays that sit above the media plane MUST NOT use `backdrop-filter` blur or continuous `filter: drop-shadow` on always-on chrome (including the fixed corner QR and next-up countdown progress). Overlays MUST use opaque or high-opacity solid/gradient scrims instead.

#### Scenario: Settings rail open over video

- **WHEN** the user opens TV settings during playback
- **THEN** the settings rail MUST remain readable without applying `backdrop-filter` blur over the video

#### Scenario: Next-up interstitial shown

- **WHEN** the next-up overlay is visible
- **THEN** its scrim MUST NOT use `backdrop-filter` blur

### Requirement: TV motion uses composited properties

TV UI transitions for chrome, queue shelf, QR affordance, and playback progress MUST animate only composited-friendly properties (`opacity`, `transform`) or update instantly. They MUST NOT animate layout-affecting properties (`width`, `height`, `max-height`, `aspect-ratio`, `top`/`left` geometry of the QR canvas size) for those interactions.

#### Scenario: Queue peek to expand

- **WHEN** the user expands the TV queue shelf
- **THEN** the shelf transition MUST NOT animate `max-height` or per-card `aspect-ratio` / thumb height

#### Scenario: Playback progress updates while controls are visible

- **WHEN** the playback progress indicator updates
- **THEN** the fill and thumb position MUST be driven via `transform` (for example `scaleX` / `translateX`), not layout `width` / `left`

#### Scenario: Chrome reveal with corner QR

- **WHEN** player chrome is revealed or hidden
- **THEN** the fixed corner QR MUST NOT regenerate its canvas due to a pixel size change

### Requirement: Density adaptation preserves composited geometry

Viewport density adaptation on the dedicated TV route MUST scale via root rem and/or CSS custom properties. It MUST NOT apply `transform: scale` or `zoom` to the TV document root or full-page shell. Short-viewport densification MUST update token values instantly or via composited properties only, and MUST NOT introduce layout-animated `width`/`height`/`max-height` transitions for density changes. Fixed corner QR expand/collapse MUST continue to use `transform` without regenerating the QR canvas for size changes.

#### Scenario: Density change does not transform the page root

- **WHEN** the CSS viewport is resized between 960×540 and 1920×1080 on `/tv`
- **THEN** the document root / `[data-tv-route]` shell is not scaled with `transform` or `zoom`, and spatial-nav focusables retain CSS-box hit geometry

#### Scenario: Short-viewport queue cap does not animate layout

- **WHEN** expanded queue max height is reduced under a short-viewport height budget
- **THEN** the cap is applied as an instant token/style update, not an animated layout size transition
