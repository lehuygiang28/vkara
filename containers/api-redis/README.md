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

| File               | Role                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| `Dockerfile`       | Build API from monorepo; runtime with Redis + supervisord + cloudflared |
| `supervisord.conf` | Runs `redis-server` and `/app/start-api.sh`                             |
| `entrypoint.sh`    | Optional `cloudflared access tcp`; starts supervisord                   |
| `start-api.sh`     | Redis defaults + exec compiled API binary                               |

## Playwright proxy (TikTok experiments)

When `VKARA_EXPERIMENTS=1`, set tunnel + proxy auth in `.env`:

```env
VKARA_EXPERIMENTS=1
CF_PROXY_TUNNEL_HOSTNAME=vkara-prx.example.giang.io.vn
PLAYWRIGHT_PROXY_USERNAME=vkara
PLAYWRIGHT_PROXY_PASSWORD=your-gost-password
```

Entrypoint starts `cloudflared access tcp` and defaults `PLAYWRIGHT_PROXY_SERVER=http://127.0.0.1:1080`.
Home gost (HTTP `:3128`) must match the Cloudflare Tunnel TCP route.

See [../README.md](../README.md#experiments-vkara_experiments).
