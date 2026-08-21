## 1. Safari 12 polyfills

- [x] 1.1 Add vitest that loads `apps/web/public/tv-polyfills.js` against a stub window: missing `Intl.PluralRules` and `MediaQueryList.addEventListener` get shims; native implementations stay untouched
- [x] 1.2 Add guarded ES5 `Intl.PluralRules` (`select` → `'other'`) and `MediaQueryList` EventTarget forwarders to `tv-polyfills.js`

## 2. Error recovery without next-intl

- [x] 2.1 Add vitest for `recoveryPhaseLabel(phase, lang)` covering `vi`, `en`, and unknown lang
- [x] 2.2 Implement the helper with hardcoded en/vi strings matching product locales; no `next-intl` import
- [x] 2.3 Switch `error.tsx` and `AppErrorBoundary` to the helper; remove `useI18n`

## 3. Related parse resilience

- [x] 3.1 Add vitest: `safeParseRelated` returns `[]` and captures when `parseRelated` throws; `loadVideoFromNextResponses` returns `video: undefined` and captures when `Video.load` throws
- [x] 3.2 Implement `safeParseRelated` and wrap `Video`/`LiveVideo.load` in `loadVideoFromNextResponses` with `captureUnexpected` tags `kind=parse`
- [x] 3.3 Use `safeParseRelated` in `fetchRelatedContinuationPage` and as fallback when `video.related` is missing after a successful InnerTube POST; keep route-level `502` only for transport failures

## 4. Verify

- [x] 4.1 Run `apps/web` and `apps/api` tests for the new files and confirm they pass
- [x] 4.2 Run `openspec validate --change fix-sentry-first-party-crashes` and fix any schema issues
