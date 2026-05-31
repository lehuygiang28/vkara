# vkara-aio

All-in-one image: **Redis + API + Next.js + Caddy**, one port **3000**.

Full deployment guide: [../README.md](../README.md).

## Quick run

```bash
cp .env.example .env
docker compose --profile aio up --build
```

## Files

| File | Role |
|------|------|
| `Dockerfile` | Multi-stage build (Bun) + runtime (Bun + Caddy + Redis binaries) |
| `Caddyfile` | Edge proxy: `/api/vkara`, `/ws`, `/vi` redirects, Next.js |
| `supervisord.conf` | Process manager for redis, api, web, caddy |
| `entrypoint.sh` | Sets `PUBLIC_APP_URL`, starts supervisord |

## Internal ports (not exposed)

| Service | Port |
|---------|------|
| Caddy (public) | `3000` |
| Next.js | `3001` |
| API | `8000` |
| Redis | `6379` |
