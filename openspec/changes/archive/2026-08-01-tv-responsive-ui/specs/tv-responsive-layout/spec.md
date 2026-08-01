## ADDED Requirements

### Requirement: Single density scale for dedicated TV route
The dedicated `/tv` UI under `[data-tv-route]` SHALL derive typography, spacing, hit targets, queue chrome, settings chrome, lobby controls, and Next Up chrome from one shared density scale (TV-scoped root rem and/or `[data-tv-route]` tokens). Density SHALL scale with CSS viewport size and SHALL be capped so a 1920×1080 reference viewport remains within ±10% of the pre-change large-TV sizes. The UI MUST NOT use root `transform`/`zoom` as the density mechanism.

#### Scenario: Short Android TV CSS viewport densifies
- **WHEN** the CSS viewport is approximately 960×540 (typical 1080p @2× Android TV WebView)
- **THEN** transport, queue peek, settings rows, and lobby primary actions remain fully on-screen without horizontal clip and feel proportionally smaller than at 1920×1080

#### Scenario: Reference FHD keeps large-TV ceilings
- **WHEN** the CSS viewport is 1920×1080
- **THEN** transport/queue/settings sizes remain at or below the previous large-TV rem ceilings (no upscale above today’s look)

### Requirement: No width-only rem freeze on TV chrome tokens
TV transport and queue height/size tokens MUST remain viewport-relative on living-room widths. The system MUST NOT apply a `min-width`-only media query that replaces fluid transport/queue tokens with large fixed rem values while ignoring viewport height.

#### Scenario: Wide short TV does not get desktop rem freeze
- **WHEN** the CSS viewport is at least 768px wide and at most 600px tall
- **THEN** transport button tokens and expanded queue height remain height-budgeted (vh/`vmin`/scaled rem), not locked to the former fixed desktop rem freeze values

### Requirement: Height budget for short living-room viewports
On short CSS viewports, regardless of width, the player chrome MUST keep a vertical fit budget: top bar + transport + queue peek (or a capped expanded shelf) fit within the viewport without off-screen primary focus targets. Compact phone-only crush (`max-height` **and** `max-width`) MAY remain for emulator/phone preview, but MUST NOT be the only densification path for short TVs.

#### Scenario: Expanded queue capped by viewport height
- **WHEN** the user expands the queue shelf on a CSS viewport ≤720px tall and ≥960px wide
- **THEN** expanded shelf max height is capped as a fraction of viewport height (or equivalent chrome budget), not a bare large fixed rem that consumes most of the screen

#### Scenario: Next Up usable on short height
- **WHEN** the Next Up interstitial is shown on a CSS viewport ≤720px tall
- **THEN** primary actions and focusable controls remain reachable on-screen (via densified spacing/type floors and/or a scrollable shell with `min-height: 0`)

### Requirement: TV components do not use phone density breakpoints
Dedicated TV chrome components MUST NOT rely on Tailwind `sm`/`md`/`lg`/`xl` breakpoints as the density scale for card widths, chrome padding, settings rail width, or control typography. Layout-only media queries for short/wide reflow remain allowed.

#### Scenario: Queue card width tracks TV scale
- **WHEN** the queue is visible on 960×540 and on 1920×1080
- **THEN** card width comes from TV tokens or scaled rem continuous sizing, not from a phone `sm`/`md`/`lg` width ladder

### Requirement: Fixed corner QR participates in scale with scan floor
The fixed corner QR canvas size and title-reserve geometry SHALL follow TV density tokens while keeping a minimum CSS pixel floor sufficient for scanning. Expand/collapse MUST continue to use `transform` only and MUST NOT resize the QR canvas bitmap for expand.

#### Scenario: QR floor on small CSS viewport
- **WHEN** density scale is at its minimum supported floor
- **THEN** the fixed QR canvas CSS size remains at least 64px and title reserve still clears the QR without overlapping the now-playing title

### Requirement: Viewport smoke matrix for acceptance
Acceptance for this capability MUST include manual or automated smoke at least at CSS sizes 960×540, 1280×720, 1366×768, and 1920×1080 for lobby, idle QR, playing chrome + queue peek, queue expanded, settings, and Next Up.

#### Scenario: Matrix covers primary failure case
- **WHEN** implementers declare the responsive change complete
- **THEN** the 960×540 playing+chrome+queue and Next Up paths have been checked for clip, off-screen focus, and oversized chrome relative to 1920×1080
