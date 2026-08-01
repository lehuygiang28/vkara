## MODIFIED Requirements

### Requirement: Client bundles downlevel to Chrome 76
The web app build SHALL rewrite client assets under `.next/static` so JavaScript syntax is compatible with Chromium 76 (Tizen 6.0). The default target SHALL be `chrome76` (overridable via `TV_CHROME_TARGET`). Skipping the downlevel pass MUST be opt-in only (`TV_DOWNLEVEL=0`) and MUST NOT be the default production build path.

#### Scenario: Production build rewrites static chunks
- **WHEN** an operator runs the web production build with downlevel enabled
- **THEN** every JS chunk under `.next/static` is transformed for the Chrome 76 target (or `TV_CHROME_TARGET` if set)

#### Scenario: CSS unsupported features are rewritten or fallback-safe
- **WHEN** the downlevel pass processes CSS under `.next/static`
- **THEN** known Chrome-76-unsafe patterns that drop whole rules (`inset:` shorthand, `:is(`, `:where(`, bare `dvh` without `vh` fallback, `:focus-visible`) are rewritten or accompanied by safe fallbacks

#### Scenario: Layout-critical CSS math is fallback-safe for Chrome 76
- **WHEN** TV route CSS under `[data-tv-route]` (or TV layout root scale rules) uses `clamp()`, `min()`, or `max()` for layout-critical sizes
- **THEN** each such declaration is preceded by a static Chrome-76-valid fallback (`rem`, `px`, `vh`/`vw`, or plain `calc`) so Chrome 76 retains a usable size when math functions are ignored

### Requirement: Build-time verify gate for Chrome 76
The web production build SHALL run an independent verify step after downlevel that fails the build if any JS chunk fails to parse at the Chrome-76-safe ECMAScript level (acorn `ecmaVersion` ≤ 2019 unless empirically adjusted and documented) or if CSS still contains ungated unsupported tokens listed above. The verify step SHALL also fail (or enforce a documented dual-declaration convention) when TV layout CSS introduces ungated `clamp(`/`min(`/`max(` without a preceding static fallback for the same property.

#### Scenario: Unsupported syntax fails CI
- **WHEN** a dependency ships a client chunk that remains unparseable after downlevel
- **THEN** the verify step exits non-zero and the build fails

#### Scenario: Ungated TV CSS math fails CI
- **WHEN** `[data-tv-route]` production CSS contains a layout-critical `clamp(`/`min(`/`max(` declaration without a static fallback for that property
- **THEN** the verify step exits non-zero and the build fails

#### Scenario: Clean build logs success
- **WHEN** downlevel and verify both succeed
- **THEN** build logs report verify OK with chunk counts

## ADDED Requirements

### Requirement: JS polyfills remain non-layout
The guarded `tv-polyfills` script SHALL continue to provide missing JavaScript APIs only. It MUST NOT be used as the mechanism for viewport density, root scale, or CSS layout polyfills (`clamp`, flex `gap`, etc.).

#### Scenario: Polyfills do not set density
- **WHEN** `tv-polyfills.js` runs on `/tv`
- **THEN** it does not assign TV density custom properties or rewrite stylesheet rules for scaling
