## MODIFIED Requirements

### Requirement: Runtime polyfills load before app JS
The locale root layout SHALL load a guarded `tv-polyfills` script `beforeInteractive` so APIs required by the client that are missing on Chrome 76 and on Safari 12 / iOS 12 (including at least `String.prototype.replaceAll`, the post-Chrome-85 shims already used by the chrome85 stack, `Intl.PluralRules`, and `MediaQueryList` event-target methods) are available before application modules run. On modern browsers the shims MUST be no-ops when the native API exists. The script MUST remain JS-API-only (no layout/CSS polyfills).

#### Scenario: Polyfill script is present on TV route
- **WHEN** a client loads `/tv` (or a localized `/tv`)
- **THEN** the polyfill script is included before interactive application code

#### Scenario: Polyfill script is present on remote locale routes
- **WHEN** a client loads a locale document that is not `/tv` (for example `/` or `/vi`)
- **THEN** the same polyfill script is included before interactive application code

## ADDED Requirements

### Requirement: Intl.PluralRules shim when missing
When `Intl.PluralRules` is absent, `tv-polyfills.js` SHALL define a constructor such that `new Intl.PluralRules(locale).select(n)` returns `'other'` for any numeric `n` and does not throw. When `Intl.PluralRules` is already a function, the script MUST NOT replace it.

#### Scenario: Safari 12 PluralRules gap
- **WHEN** the polyfill script runs in an environment with no `Intl.PluralRules`
- **THEN** `new Intl.PluralRules('en').select(1)` returns `'other'`
- **AND** `new Intl.PluralRules('vi').select(2)` returns `'other'`

#### Scenario: Native PluralRules untouched
- **WHEN** the polyfill script runs where `Intl.PluralRules` already exists
- **THEN** the native constructor identity is unchanged

### Requirement: MediaQueryList EventTarget shim when missing
When `MediaQueryList.prototype.addEventListener` is not a function and `addListener` exists, `tv-polyfills.js` SHALL define `addEventListener` and `removeEventListener` that forward `change` listeners to `addListener` / `removeListener`. When `addEventListener` already exists, the script MUST NOT replace it.

#### Scenario: Legacy MediaQueryList
- **WHEN** a `MediaQueryList` has `addListener` but no `addEventListener`
- **AND** the polyfill script has run
- **THEN** `mq.addEventListener('change', fn)` calls `addListener(fn)`
- **AND** `mq.removeEventListener('change', fn)` calls `removeListener(fn)`

#### Scenario: Native MediaQueryList untouched
- **WHEN** `MediaQueryList.prototype.addEventListener` is already a function
- **THEN** the polyfill script does not replace that method
