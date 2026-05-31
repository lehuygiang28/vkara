# Docker deployment

Images and compose profiles for running vkara in production or self-hosted setups.

## Layout

```
vkara/
├── apps/
│   ├── api/Dockerfile       # API only (distroless, compiled Bun binary)
│   └── web/Dockerfile       # Web only (Next.js standalone on Node)
├── containers/
│   ├── aio/                 # All-in-one: Redis + API + Web + Caddy (:3000)
│   └── api-redis/           # API + Redis (no web)
└── docker-compose.yml       # Profiles: api | web | bundle | aio
```

| Image | Dockerfile | Exposed ports | Use when |
|-------|------------|---------------|----------|
| `lehuygiang28/vkara-api` | `apps/api/Dockerfile` | `8000` | API behind your own Redis / reverse proxy |
| `lehuygiang28/vkara-web` | `apps/web/Dockerfile` | `3000` | Frontend only; point env at external API |
| `lehuygiang28/vkara-api-redis` | `containers/api-redis/Dockerfile` | `8000`, `6379` | Backend bundle without Next.js |
| `lehuygiang28/vkara-aio` | `containers/aio/Dockerfile` | `3000` | Single container, one public port |

Build context is always the **repository root** (`.`), including monorepo `packages/*`.

---

## Quick start

### All-in-one (recommended for self-host)

```bash
cp containers/aio/.env.example containers/aio/.env
# edit PUBLIC_APP_URL if not localhost

docker compose --profile aio up --build
# → http://localhost:3000
```

### Split stack (api + web)

Terminal A — API (needs Redis reachable via env):

```bash
cp apps/api/.env.example apps/api/.env
docker compose --profile api up --build
```

Terminal B — Web:

```bash
cp apps/web/.env.example apps/web/.env.local
# set NEXT_PUBLIC_API_URL / NEXT_PUBLIC_WS_URL to your API origin

docker compose --profile web up --build
```

### API + Redis bundle

```bash
cp containers/api-redis/.env.example containers/api-redis/.env
docker compose --profile bundle up --build
# API → localhost:8001 (default), Redis → localhost:6379
```

---

## Docker Compose profiles

| Profile | Services | Command |
|---------|----------|---------|
| `api` | `vkara_api` | `docker compose --profile api up` |
| `web` | `vkara_web` | `docker compose --profile web up` |
| `bundle` | `api_redis` | `docker compose --profile bundle up` |
| `aio` | `vkara_aio` | `docker compose --profile aio up` |

Optional env for compose (shell or `.env` at repo root):

| Variable | Default | Meaning |
|----------|---------|---------|
| `COMPOSE_TAG` | `latest` | Image tag |
| `WEB_PORT` | `3000` | Host port for web profile |
| `AIO_PORT` | `3000` | Host port for aio profile |
| `BUNDLE_PORT` | `8001` | Host port for api-redis bundle API |
| `REDIS_PORT` | `6379` | Host port for bundle Redis |

---

## Build manually

From repo root:

```bash
docker build -f apps/api/Dockerfile -t vkara-api:local .
docker build -f apps/web/Dockerfile -t vkara-web:local .
docker build -f containers/api-redis/Dockerfile -t vkara-api-redis:local .
docker build -f containers/aio/Dockerfile -t vkara-aio:local .
```

Pull published images:

```bash
docker pull lehuygiang28/vkara-aio:latest
docker run --rm -p 3000:3000 lehuygiang28/vkara-aio:latest
```

CI builds and pushes all four images on push to `main` / `develop` (see `.github/workflows/build-push-docker.yml`). Commit with `[skip docker]` to skip the workflow.

---

## AIO architecture

Single public port **3000** (Caddy). Internal services are not exposed.

```
Client :3000
    │
    ▼
  Caddy
    ├─ /api/vkara/*  → API :8000   (strip prefix)
    ├─ /ws*          → API :8000   (WebSocket)
    ├─ /vi*          → 301 → /     (legacy locale URLs)
    └─ /*            → Next.js :3001
```

Build-time (in `containers/aio/Dockerfile`):

- `NEXT_PUBLIC_API_URL=/api/vkara` — browser calls same-origin REST
- `VKARA_AIO=1` — middleware skips `/vi` redirect (Caddy handles it at the edge)

Runtime processes (supervisord): `redis` → `api` → `web` → `caddy`.

Health check:

```bash
curl http://localhost:3000/api/vkara/health
curl -I http://localhost:3000/
```

---

## Environment variables

### `apps/api` (standalone API)

See `apps/api/.env.example`. Required for production:

| Variable | Description |
|----------|-------------|
| `PORT` | Listen port (default `8000`) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection |
| `PUBLIC_APP_URL` | Web origin for YouTube embed checks (e.g. `https://vkara.example.com`) |

### `apps/web` (standalone web)

See `apps/web/.env.example`. Client vars must be set **at build time** for production images:

| Variable | Standalone example | AIO (set in Dockerfile) |
|----------|-------------------|-------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/` | `/api/vkara` |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/` | *(empty → same-origin `/ws`)* |
| `NEXT_PUBLIC_APP_URL` | Public site URL | Same as `PUBLIC_APP_URL` |

Server-only (optional): `WHISPER_URL`, `HF_TOKEN` for speech routes under `/api/speech/*`.

### `containers/api-redis`

See `containers/api-redis/.env.example`. Redis password defaults to `giang` in supervisord (change for production).

### `containers/aio`

See `containers/aio/.env.example`:

| Variable | Description |
|----------|-------------|
| `PUBLIC_APP_URL` | Public URL (default `http://localhost:3000`) |
| `VKARA_AIO` | Must stay `1` in this image |

Redis credentials are fixed inside the image (`127.0.0.1:6379`, password `giang`).

---

## Production notes

1. **Set `PUBLIC_APP_URL`** (aio / api) to your real domain so YouTube embed checks pass.
2. **Change Redis password** in bundle/aio before exposing Redis port (`bundle` profile maps `6379` to the host).
3. **HTTPS**: put aio behind a reverse proxy (Traefik, Caddy, nginx) or terminate TLS at the host; aio Caddy listens on plain HTTP `:3000`.
4. **Web + API split**: rebuild web when changing `NEXT_PUBLIC_*`; they are baked into the Next.js bundle.
5. **Monorepo builds**: do not run `docker build` from `apps/api` or `apps/web` alone — context must be repo root.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Web cannot reach API | `NEXT_PUBLIC_API_URL` / WS URL; CORS is open on API but URLs must match |
| AIO `/` errors | Hard-refresh browser (old redirects may be cached) |
| Build fails on `npm` / TypeScript | Build from repo root; aio Dockerfile installs workspace filters + `typescript` |
| Redis connection refused (api profile) | API image has no Redis — use `bundle` or external Redis |

For local development without Docker, use `bun run dev:web` and `bun run dev:api` from the repo root.
