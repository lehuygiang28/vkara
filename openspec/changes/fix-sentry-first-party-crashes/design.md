## Context

Sentry production (org `vkara`) currently files two first-party crash clusters:

1. **WEB-B / WEB-C** — Mobile Safari 12.1.2 / iOS 12.5.8. `next-intl` constructs `new Intl.PluralRules(locale)` (missing until Safari 13). The same session then hits `MediaQueryList.addEventListener is not a function` (`subscribeFinePointer` and `subscribeCoarsePointer` use the EventTarget API; Safari 14+). Locale `error.tsx` and `AppErrorBoundary` call `useI18n()`, so the recovery chrome re-throws the PluralRules crash. Replay + Seer confirm a white screen, not a third-party inject.
2. **API-A / API-C** — `POST /related` wraps youtubei `Video.load` / `BaseVideoParser.parseRelated` in a route-level try/catch that maps **any** throw to `502 youtube_upstream_failed`. Innertube schema drift (`videoInfo.attributedDescription.content`, `onResponseReceivedEndpoints[0]`) is a parse TypeError after a successful InnerTube POST. Event count is the impact (proxy IP collapses users=1). Still firing.

`tv-polyfills.js` already loads `beforeInteractive` from `apps/web/src/app/[locale]/layout.tsx` on **every** locale document (not only `/tv`). It is ES5, guarded, JS-API-only.

## Goals / Non-Goals

**Goals:**

- Stop Safari 12 / iOS 12 from white-screening on first paint (PluralRules + MediaQueryList).
- Keep error recovery renderable when `next-intl` / `Intl` is the failing subsystem.
- Return a usable related JSON body (`200`, possibly empty `items`) when youtubei parsers throw on schema drift; keep reporting those parse failures to Sentry.
- Keep polyfills no-op on modern browsers; keep `/related` `502` for real InnerTube HTTP failures.

**Non-Goals:**

- Full CLDR `Intl.PluralRules` (cardinals, ordinals, `resolvedOptions`). `select()` → `'other'` is enough to stop the crash.
- Raising the documented TV floor above Tizen 6.0 / Chrome 76; this change only extends the existing shim file.
- Fixing Zalo inject (`WEB-8`/`WEB-9`), YouTube iframe SOP on Tizen (`WEB-A`), anonymous `videoElement.paused` (`WEB-7`), cron / Redis noise, reconnect-banner UX (not an exception).
- Replacing youtubei or pinning Innertube response shapes.
- Changing the public `/related` JSON schema.

## Decisions

### D1 — Extend `tv-polyfills.js` (no npm Intl polyfill)

| | npm `intl-pluralrules` + app import | Guarded shims in `tv-polyfills.js` |
|--|--|--|
| Load order | After module graph; can race `next-intl` | `beforeInteractive`, before app JS |
| Syntax | Modern package, needs downlevel | File is already ES5 |
| Modern browsers | Extra bytes always | No-op when native exists |
| Layout spec | Extra dependency | Matches `tv-chrome76-runtime` JS-API-only rule |

**Chosen:** add two guarded blocks to `apps/web/public/tv-polyfills.js`.

- `Intl.PluralRules`: constructor stores locale; `select()` returns `'other'`; `resolvedOptions()` returns `{ locale, type: 'cardinal' }` if called. Do not implement `selectRange`.
- `MediaQueryList`: if `prototype.addEventListener` is missing and `addListener` exists, define `addEventListener` / `removeEventListener` that forward `type === 'change'` to `addListener` / `removeListener`. Ignore other event types. Do not replace native EventTarget methods.

**Rejected:** wrapping every `matchMedia` call site with `addListener` fallback — two call sites today, easy to regress (`youtube/index.tsx`, `use-prefer-bottom-chrome.ts`). One prototype shim covers both and future subscribers.

### D2 — Recovery labels without `next-intl`

`RecoveryShell` labels are **sr-only**. `useI18n()` pulls in the same PluralRules path that just crashed.

**Chosen:** a tiny helper (no `'use client'` requirement beyond callers) `recoveryPhaseLabel(phase, lang)` with a hardcoded `en` / `vi` map matching existing locale strings. Lang from `document.documentElement.lang` (layout already sets it) with `en` fallback. `error.tsx` and `AppErrorBoundary` MUST NOT import `@/locales/client`.

**Rejected:** keeping `useI18n` behind try/catch (hooks cannot be optional). **Rejected:** English-only forever (Vietnamese remotes are the default locale).

### D3 — Degrade related parse, do not 502 the shelf

InnerTube HTTP (`postInnertube` → `client.http.post`) failing is a real upstream outage → keep `502 youtube_upstream_failed`.

Parser TypeErrors after a successful POST are schema drift → karaoke related shelf should stay empty, player stays up.

**Chosen:**

1. `loadVideoFromNextResponses` wraps `Video.load` / `LiveVideo.load` in try/catch. On throw: capture with tags `area=youtube`, `route=related`, `kind=parse`, `handled=yes`, level `warning`; return `{ video: undefined, nextResponseData }`.
2. Shared `safeParseRelated(raw, client)` wraps `BaseVideoParser.parseRelated`. On throw: same capture; return `[]`. Continuation parse uses the same wrapper in `fetchRelatedContinuationPage`.
3. `/related` initial path: if `video?.related` is missing after (1), parse items and continuation independently from `nextResponseData` so a failed `Video.load` can still yield a shelf and a next-page token. If items are empty and continuation is missing, return `200 { items: [], continuation: undefined }`.
4. Route-level catch remains for HTTP / unexpected failures only.

**Rejected:** swallowing all `/related` errors into empty 200 (would hide real YouTube outages). **Rejected:** forking youtubei.

### D4 — Tests target helpers, not the IIFE-as-app

- Polyfills: vitest loads `public/tv-polyfills.js` against a stub `window` / `Intl` / `MediaQueryList` (delete native APIs, assert shims; restore natives, assert no-op).
- Recovery labels: unit-test the helper (lang `vi` / `en` / unknown).
- Related: unit-test `safeParseRelated` and `loadVideoFromNextResponses` with mocked youtubei `Video.load` / `BaseVideoParser.parseRelated` throws; assert empty result + that capture is invoked (spy). Do not require a live InnerTube.

## Risks / Trade-offs

- [Safari 12 still crashes on a different missing Intl API] → Mitigation: only PluralRules is in the WEB-B stack; `intl-locale-textinfo-polyfill` is already imported for `Intl.Locale`. If a new Intl crash appears, extend the same shim file.
- [`select()` always `'other'` mis-pluralizes copy on iOS 12] → Acceptable: Vietnamese does not use English-style plurals; English fallback “other” is grammatical enough vs white screen.
- [Empty related shelf looks like “no recommendations”] → Better than 502 killing the request; Sentry `kind=parse` keeps drift visible.
- [New Sentry issue for `kind=parse`] → Intended: WEB/API crash issues should resolve; parse warnings are observability, not user-facing failures.
- [Polyfill tests diverge from the public file] → Single source is the public ES5 file; tests execute that file.

## Migration Plan

- Deploy web + API together if possible; they are independent (web polyfill does not need API, API degrade does not need web).
- Rollback: revert the two app changes; polyfill no-ops on modern browsers so rollback is safe.
- After deploy: confirm `VKARA-WEB-B`, `VKARA-WEB-C`, `VKARA-API-A`, `VKARA-API-C` stop getting **unhandled / 502** events. Parse warnings may continue at low volume.

## Open Questions

None blocking implementation. Commit trailers `Fixes VKARA-WEB-B` / `WEB-C` / `API-A` / `API-C` when the user asks to commit.
