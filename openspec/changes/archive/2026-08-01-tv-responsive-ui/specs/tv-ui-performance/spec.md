## ADDED Requirements

### Requirement: Density adaptation preserves composited geometry
Viewport density adaptation on the dedicated TV route MUST scale via root rem and/or CSS custom properties. It MUST NOT apply `transform: scale` or `zoom` to the TV document root or full-page shell. Short-viewport densification MUST update token values instantly or via composited properties only, and MUST NOT introduce layout-animated `width`/`height`/`max-height` transitions for density changes. Fixed corner QR expand/collapse MUST continue to use `transform` without regenerating the QR canvas for size changes.

#### Scenario: Density change does not transform the page root
- **WHEN** the CSS viewport is resized between 960×540 and 1920×1080 on `/tv`
- **THEN** the document root / `[data-tv-route]` shell is not scaled with `transform` or `zoom`, and spatial-nav focusables retain CSS-box hit geometry

#### Scenario: Short-viewport queue cap does not animate layout
- **WHEN** expanded queue max height is reduced under a short-viewport height budget
- **THEN** the cap is applied as an instant token/style update, not an animated layout size transition
