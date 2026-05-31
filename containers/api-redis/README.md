# vkara-api-redis

Bundle image: **Redis + API** (compiled Bun binary), no web frontend.

Full deployment guide: [../README.md](../README.md).

## Quick run

```bash
cp .env.example .env
docker compose --profile bundle up --build
```

Default host mapping: API **8000** only. Redis runs inside the container and is not published.

## Files

| File | Role |
|------|------|
| `Dockerfile` | Build API from monorepo; runtime with Redis + supervisord |
| `supervisord.conf` | Runs `redis-server` and `/app/server` |
| `entrypoint.sh` | Starts supervisord |

Pair with `lehuygiang28/vkara-web` or your own Next.js deployment for a full stack.
