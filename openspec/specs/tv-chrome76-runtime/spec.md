# tv-chrome76-runtime Specification

## Purpose
Hosted `/tv` web runtime compatibility floor for Tizen 6.0 (~Chrome 76): client downlevel, verify gate, polyfills, and non-sticky TV document cache headers.
## Requirements
### Requirement: Client bundles downlevel to Chrome 76
The web app build SHALL rewrite client assets under `.next/static` so JavaScript syntax is compatible with Chromium 76 (Tizen 6.0). The default target SHALL be `chrome76` (overridable via `TV_CHROME_TARGET`). Skipping the downlevel pass MUST be opt-in only (`TV_DOWNLEVEL=0`) and MUST NOT be the default production build path.

#### Scenario: Production build rewrites static chunks
- **WHEN** an operator runs the web production build with downlevel enabled
- **THEN** every JS chunk under `.next/static` is transformed for the Chrome 76 target (or `TV_CHROME_TARGET` if set)

#### Scenario: CSS unsupported features are rewritten or fallback-safe
- **WHEN** the downlevel pass processes CSS under `.next/static`
- **THEN** known Chrome-76-unsafe patterns that drop whole rules (`inset:` shorthand, `:is(`, `:where(`, bare `dvh` without `vh` fallback, `:focus-visible`) are rewritten or accompanied by safe fallbacks

### Requirement: Build-time verify gate for Chrome 76
The web production build SHALL run an independent verify step after downlevel that fails the build if any JS chunk fails to parse at the Chrome-76-safe ECMAScript level (acorn `ecmaVersion` ≤ 2019 unless empirically adjusted and documented) or if CSS still contains ungated unsupported tokens listed above.

#### Scenario: Unsupported syntax fails CI
- **WHEN** a dependency ships a client chunk that remains unparseable after downlevel
- **THEN** the verify step exits non-zero and the build fails

#### Scenario: Clean build logs success
- **WHEN** downlevel and verify both succeed
- **THEN** build logs report verify OK with chunk counts

### Requirement: Runtime polyfills load before app JS
The root layout SHALL load a guarded `tv-polyfills` script `beforeInteractive` so APIs required by the client that are missing on Chrome 76 (including at least `String.prototype.replaceAll` and the post-Chrome-85 shims already used by the chrome85 stack) are available before application modules run. On modern browsers the shims MUST be no-ops when the native API exists.

#### Scenario: Polyfill script is present on TV route
- **WHEN** a client loads `/tv` (or a localized `/tv`)
- **THEN** the polyfill script is included before interactive application code

### Requirement: TV HTML is not sticky-cached
The Next.js app SHALL send `Cache-Control: no-store, must-revalidate` for the `/tv` and `/:locale/tv` document routes so Smart TV private profiles do not keep a stale HTML shell across deploys. Hashed `/_next/static` assets MUST remain cacheable as today.

#### Scenario: Document headers on TV routes
- **WHEN** a client requests `/tv` or `/:locale/tv`
- **THEN** the response includes `Cache-Control: no-store, must-revalidate`

### Requirement: Support floor documented as Tizen 6.0 / Chrome 76
Operator-facing docs that describe web TV runtime compatibility SHALL state Tizen 6.0+ (~Chrome 76) as the floor and SHALL NOT claim chrome85-only as the sole supported web baseline. GitHub issue #6 acceptance SHALL be retargeted to chrome76 / Tizen 6.0 when this change lands.

#### Scenario: Standalone TV docs match floor
- **WHEN** an operator reads standalone TV / tizen web-runtime docs
- **THEN** they see Chrome 76 / Tizen 6.0 as the hosted-app compatibility floor
