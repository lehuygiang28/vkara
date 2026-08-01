## Context

- Product floor: **Tizen 6.0 ≈ Chromium 76** (2021). Tizen 6.5 ≈ Chrome 85 remains a smoke target.
- `main` today: no `tv-downlevel` / `tv-verify` / `tv-polyfills` / `/tv` no-store.
- Reference implementation on `alfrededison/main` (`e1cc87a`, `115c28c`, `b72e315`) targets **chrome85** + acorn **ES2021**.
- Tizen shell is already ES5; this change is **apps/web only**.

## Goals / Non-Goals

**Goals:**

- Client chunks under `.next/static` are syntax-compatible with Chrome 76 after build.
- Build fails closed if verify detects unsupported JS/CSS tokens for that floor.
- Runtime APIs the app needs that are missing on Chrome 76 are shimmed (guarded).
- `/tv` HTML is not sticky-cached by the TV’s private browser profile.
- Docs + #6 describe chrome76 / Tizen 6.0, not chrome85-only.

**Non-Goals:**

- Changing Tizen packaging / shell.
- Supporting Tizen 5.5 / Chrome &lt; 76.
- Perfect CSS feature parity (only rewrite known-safe patterns that drop whole rules).
- Replacing Next.js SWC with a different bundler.

## Decisions

### D1 — Port alfrededison stack, then retarget (not rewrite)

**Decision:** Copy `tv-downlevel.mjs`, `tv-verify.mjs`, `lib/collect-files.mjs`, `tv-polyfills.js`, layout Script wire-up, CSS fallbacks, and next.config headers from `alfrededison/main`, then change defaults to chrome76.

**Rejected:** Greenfield rewrite; only documenting chrome76 without the build gate.

### D2 — Default target `chrome76` (+ explicit ES year cap)

| Knob | Value | Why |
|------|-------|-----|
| `browserslist` | `chrome 76` | Guides Next/SWC first-party transpile |
| `TV_CHROME_TARGET` default | `chrome76` | esbuild vendor-chunk rewrite |
| esbuild `supported` / output | keep an explicit **es2019** (or es2020-minus-optional-chaining) parse cap if needed so verify stays airtight | Chrome 76 lacks optional chaining (80) / nullish (80) / logical assignment (85) — esbuild `chrome76` already downlevels those; verify must not accept ES2021 output |
| `tv-verify` acorn `ecmaVersion` | **2019** | Matches “provably parseable on Chrome 76” better than 2021 |

Tune with `TV_CHROME_TARGET`; skip with `TV_DOWNLEVEL=0` (dev escape hatch only).

### D3 — CSS gates stay (already post-76)

Keep alfrededison CSS rewrites/gates: `inset:`, `:is(`, `:where(`, `dvh`, `:focus-visible`. All are Chrome 86+ features; still required for 76.

### D4 — Polyfills: keep post-85 shims + add 76→85 gaps used by app

Keep: `Array/String.at`, `Object.hasOwn`, `findLast*`, `crypto.randomUUID`, `structuredClone`.

Add (guarded) at least:

- `String.prototype.replaceAll` (Chrome 85)
- `Promise.any` + `AggregateError` if referenced after bundle inspection (add only if used or cheap)

Do not polyfill entire modern JS — prefer downlevel for syntax.

### D5 — `/tv` no-store headers

Same as `115c28c`: `Cache-Control: no-store, must-revalidate` on `/tv` and `/:locale/tv` only. Hashed `/_next/static` unchanged.

### D6 — Close #6 with retargeted acceptance

Update issue title/body/checkboxes to chrome76 / Tizen 6.0; keep packaging out of scope.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| esbuild chrome76 + acorn 2019 disagree → CI red | Iterate verify level / esbuild options until green on `bun run build` |
| App uses unpolyfilled Chrome 80–84 API at runtime | Device smoke on Tizen 6.0; add shim when Sentry/UA shows missing API |
| Larger transform cost on CI | Acceptable; downlevel is post-`next build` only |
| Over-broad CSS rewrite changes specificity | Keep alfrededison’s known-safe patterns only |

## Migration Plan

1. Land on a feature branch; `bun run build` must pass downlevel+verify.
2. Deploy web; same Tizen 6.0 device re-smoke `/tv` (shell already works).
3. Update/close #6.
4. Rollback: revert web PR; shell unaffected. `TV_DOWNLEVEL=0` is not a production rollback.

## Open Questions

- Exact acorn `ecmaVersion` if esbuild still emits a 2020 construct under `chrome76` — resolve empirically during apply.
- Whether `Promise.any` is actually in the client graph — add only if needed.
