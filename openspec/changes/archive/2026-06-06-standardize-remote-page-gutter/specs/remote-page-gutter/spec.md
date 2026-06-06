## ADDED Requirements

### Requirement: Single horizontal gutter token

The remote web UI MUST define one rem-based horizontal gutter token (`--vkara-page-gutter`, default `1rem`) and computed inline start/end values that equal `max(env(safe-area-inset-left|right), --vkara-page-gutter)`. All page-gutter Tailwind utilities and legacy `*-safe-offset` horizontal utilities MUST resolve from these tokens.

#### Scenario: Device without side safe areas

- **WHEN** the user views the remote page on a viewport where `safe-area-inset-left` and `safe-area-inset-right` are zero
- **THEN** horizontal padding and positioned inset from gutter utilities MUST both equal `1rem` from the viewport edge

#### Scenario: Device with side safe areas

- **WHEN** the user views the remote page on a device where a side safe area inset exceeds `1rem`
- **THEN** horizontal padding MUST use the safe area inset value for that side

### Requirement: Chrome band edge alignment

On the mobile remote tab shell, the primary content left and right edges MUST align across the search header, video list toolbar (when present), scrollable video list content, now-playing bar, and bottom navigation bar within one CSS pixel at widths 320px through 430px.

#### Scenario: Browse tab idle

- **WHEN** the user is on the browse/search tab with the default header and list visible
- **THEN** the search field chrome, list row thumbnails, now-playing bar artwork, and bottom nav icon row MUST share the same left content edge
- **AND** trailing actions on the right MUST share the same right content edge

#### Scenario: Search results header

- **WHEN** the user is viewing search results with the back button visible
- **THEN** the search field MUST align with list content below such that the back button sits inside the gutter box without pushing the field past the list edge

### Requirement: Shell-owned horizontal inset

Remote shell bands MUST apply horizontal gutter exactly once at the band wrapper. Child list rows, footers, and empty states inside a guttered scroll container MUST NOT add a second horizontal gutter utility unless the element is explicitly full-bleed.

#### Scenario: Video list loading footer

- **WHEN** the video list displays a loading or error footer inside a guttered list container
- **THEN** the footer MUST NOT apply an additional horizontal gutter utility

#### Scenario: List row padding

- **WHEN** a video list row renders inside a guttered list
- **THEN** row horizontal inset MUST come from the shell gutter only (row MAY use vertical padding and internal gap)

### Requirement: Floating edge controls use gutter token

Fixed or absolute controls anchored to the left or right viewport edge on remote list surfaces (e.g. scroll-to-top, horizontal scroll rails) MUST use the same gutter token as chrome bands, not a separate hard-coded rem offset.

#### Scenario: Scroll-to-top button

- **WHEN** the scroll-to-top control is visible on a remote list tab
- **THEN** its horizontal offset from the viewport edge MUST match the list content gutter

### Requirement: Documented layout contract

The codebase MUST export the preferred gutter utility class name and CSS variable keys from the remote chrome layout module alongside existing chrome height variables, so new remote components can adopt the contract without duplicating magic values.

#### Scenario: New remote panel

- **WHEN** a developer adds a new remote panel header
- **THEN** they MUST be able to import a single exported gutter class constant rather than choosing ad hoc Tailwind padding
