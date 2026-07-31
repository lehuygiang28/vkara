# Standalone TV deployment (your own frontend + upstream backend)

How to run the vkara Samsung TV app fully under your own control: you deploy
the **frontend** (this fork, free Vercel Hobby plan) and reuse the upstream
author's **backend**. No cooperation from the upstream project is needed.

```
┌──────────────────┐  loads   ┌──────────────────────────┐  WS/HTTP  ┌────────────────────────────┐
│ Samsung TV        │ ───────▶ │ YOUR Vercel deployment    │ ────────▶ │ upstream backend            │
│ WGT or TizenBrew  │          │ <your-app>.vercel.app/tv  │           │ vkara-realtime.giang.io.vn  │
└──────────────────┘          └──────────────────────────┘           └────────────────────────────┘
```

Why this split: the local shell (WGT or TizenBrew module) must stay thin — a
Next.js app-router frontend can't run from a Tizen widget's local origin —
and the backend is already open — its CORS reflects any origin and the `/ws`
WebSocket upgrade accepts foreign `Origin` headers (verified 2026-07-23). If
that ever gets locked down, self-host the backend instead with the
`lehuygiang28/vkara-api` Docker image and change two env vars below.

**Web TV runtime note:** chrome85 downlevel / polyfills / `/tv` `no-store`
must be present on the frontend you deploy (see
[#6](https://github.com/lehuygiang28/vkara/issues/6) if missing on upstream
`main`).

## 1. Import the repo on Vercel

1. [vercel.com](https://vercel.com) → log in **with GitHub** →
   **Add New → Project** → import your fork.
2. **Set Root Directory to `apps/web`** — the one critical monorepo setting.
   Everything else comes from [apps/web/vercel.json](../apps/web/vercel.json)
   (Bun 1.x, `bun install` + `bun run build:web` from the repo root, Next.js
   auto-detected).

## 2. Set the environment variables

Project **Settings → Environment Variables**:

```
NEXT_PUBLIC_API_URL        = https://vkara-realtime.giang.io.vn
NEXT_PUBLIC_WS_URL         = wss://vkara-realtime.giang.io.vn/ws
NEXT_PUBLIC_TIKTOK_API_URL = https://vkara-tiktok-api.giang.io.vn
NEXT_PUBLIC_APP_URL        = https://<your-project>.vercel.app
```

`NEXT_PUBLIC_APP_URL` makes canonical/Open Graph URLs point at your own
domain (you can add it after the first deploy once you know the URL).
Sentry/analytics stay off without their vars, and Vercel sets `CI=1`, which
skips strict env validation at build time.

## 3. Deploy and verify

Deploy the frontend, then open `https://<your-project>.vercel.app/tv` in a
desktop browser — you should see the TV lobby with a room code and QR.

If the app white-screens on a real Samsung TV but works on desktop, the
frontend still needs the separate Chrome 85 / TV runtime work tracked in
[#6](https://github.com/lehuygiang28/vkara/issues/6). Packaging the shell
alone does not fix that.

## 4. Build the TV shell (both adapters)

The shell URL is **configurable**. Source keeps placeholder `__VKARA_TV_URL__`;
stage bakes either `VKARA_TV_URL` or the fallback in
`apps/tizen/package.json` → `vkara.defaultTvUrl`.

```sh
# point the shell at your frontend
VKARA_TV_URL=https://<your-project>.vercel.app/tv bun run build:tizen
```

| Output | Path | Use |
|--------|------|-----|
| Unsigned WGT | `apps/tizen/dist/vKara.wgt` | Sideload with [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) |
| TizenBrew pack | `apps/tizen/dist/tizenbrew/` (+ `.tgz`) | Publish under **your** npm scope if you want Module Manager install |

TV setup is in [apps/tizen/README.md](../apps/tizen/README.md). Supported models:
Tizen 6.5+ (2022+).

Upstream npm package `@vkara/tv` releases bake the default
`vkara.defaultTvUrl` (env unset on CI). Forks with a custom URL must publish a
different package name — do not overwrite `@vkara/tv`.

Rebuild the shell only when the wrapper or target URL changes. Web deploys ≠
shell release.

## CLI alternative

Prefer the terminal over the dashboard? `npm i -g vercel && vercel login`,
then `cd apps/web && vercel --prod`. The GitHub integration is still the
better default — it gives you auto-deploys on push.

## Troubleshooting

- **White/blank screen on the TV, site fine on desktop** — usually the hosted
  `/tv` bundle is too new for Tizen’s pinned Chromium. See
  [#6](https://github.com/lehuygiang28/vkara/issues/6). "Works in the TV’s
  browser app" does not prove the web-app runtime can run it.
- **Which engine does my TV actually have?** Splash/error overlay prints the
  full user agent (`Chrome/xx`) at the bottom of the screen.
- **Shell opens the wrong host** — rebuild with
  `VKARA_TV_URL=https://your-host/tv` (or change `vkara.defaultTvUrl`).
- **Room won't connect** — verify `NEXT_PUBLIC_WS_URL` ends with `/ws` and
  uses `wss://`, and that the backend is reachable.
