## ADDED Requirements

### Requirement: Recovery chrome does not call next-intl
Locale `error.tsx` and `AppErrorBoundary` MUST render `RecoveryShell` without importing or calling `useI18n` / `next-intl`. Screen-reader phase labels MUST come from a helper that maps recovery phase plus document language (`en` / `vi`, default `en`) and MUST NOT construct `Intl.PluralRules`.

#### Scenario: Fallback renders without i18n hooks
- **WHEN** the locale error boundary or React error boundary fallback renders
- **THEN** it does not call `useI18n`
- **AND** `RecoveryShell` still receives a non-empty sr-only label for the current phase

#### Scenario: Vietnamese document language
- **WHEN** `document.documentElement.lang` is `vi`
- **AND** the recovery phase is `retrying`
- **THEN** the label MUST match the Vietnamese retrying copy already used in product locales

#### Scenario: Unknown language falls back to English
- **WHEN** document language is missing or not `vi`
- **THEN** the label MUST use the English recovery copy
