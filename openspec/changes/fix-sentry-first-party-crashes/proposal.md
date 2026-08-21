## Why

Production Sentry is catching two first-party crashes that break karaoke for real users: (1) iOS 12 / Safari 12 white-screens on first paint because `next-intl` constructs `Intl.PluralRules` and the locale error boundary also calls i18n (`VKARA-WEB-B`, `VKARA-WEB-C`); (2) `POST /related` returns 502 when youtubei throws on Innertube schema drift (`VKARA-API-A`, `VKARA-API-C`). Both are still unresolved. This change fixes those crashes without adding features.

## What Changes

- Extend the existing guarded `tv-polyfills.js` (already loaded `beforeInteractive` on every locale layout) with `Intl.PluralRules` and `MediaQueryList.addEventListener` / `removeEventListener` fallbacks to the legacy `addListener` / `removeListener` APIs. Native implementations stay untouched.
- Stop locale `error.tsx` and `AppErrorBoundary` from calling `useI18n()` so recovery chrome cannot re-throw the same Intl crash.
- Treat youtubei `Video.load` / `parseRelated` failures on missing Innertube fields as a degraded related list (empty or partial `200`), not a `502 youtube_upstream_failed`. Still record the parse failure for Sentry.
- Tests covering polyfill guards (or equivalent unit tests for the recovery label helper and related parse wrappers). Commit messages reference `Fixes VKARA-WEB-B`, `Fixes VKARA-WEB-C`, `Fixes VKARA-API-A`, `Fixes VKARA-API-C`.

## Capabilities

### New Capabilities

- `youtube-related-parse-resilience`: `POST /related` survives Innertube payload shape changes in youtubei parsers; callers get a list (possibly empty) instead of a hard upstream 502 for schema-drift TypeErrors.
- `error-boundary-without-intl`: Next.js / React error recovery UI must render without `next-intl` / `Intl.PluralRules` so the safety net works on Safari 12.

### Modified Capabilities

- `tv-chrome76-runtime`: Runtime JS polyfill script MUST also cover Safari 12 / iOS 12 gaps observed in production (`Intl.PluralRules`, `MediaQueryList` event-target methods). Script remains JS-API-only and no-op when native APIs exist.

## Impact

- `apps/web/public/tv-polyfills.js`, locale `error.tsx`, `app-error-boundary.tsx`, possibly a tiny recovery-label helper.
- `apps/api/src/modules/youtube/load-video-from-next.ts`, `fetch-related-page.ts`, and the `/related` handler in `youtubei.ts`.
- Tests under `apps/web` and `apps/api`. Public HTTP contract for `/related` stays the same JSON shape; only the 502-on-parse-crash behavior changes.
- Sentry issues `VKARA-WEB-B`, `VKARA-WEB-C`, `VKARA-API-A`, `VKARA-API-C` should stop recurring after deploy. Out of scope: Zalo inject (`WEB-8`/`WEB-9`), YouTube iframe SOP (`WEB-A`), cron noise, reconnect-banner UX (not an exception).
