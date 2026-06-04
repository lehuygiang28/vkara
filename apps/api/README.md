# vkara API

Bun + Elysia backend: REST, WebSocket rooms, Redis, BullMQ.

Setup and env vars: [repository README](../../README.md#quick-start) and [Docker deployment](../../containers/README.md).

```bash
bun run dev:api   # from repo root
```

Default port: **8000**.

### Embed playability (optional)

All flags use the same format: `true` | `false` | `1` | `0` | `yes` | `no` | `on` | `off` (case-insensitive). Unset boolean flags default to **off**.

| Variable | Default | Description |
|----------|---------|-------------|
| `VKARA_EMBED_CACHE_TTL_SECONDS` | `2592000` (30d) | Redis TTL for `youtube-embed:{videoId}` (`0` / `1`) |
| `VKARA_EMBED_PREFILTER_AT_LIST` | off | Filter non-embeddable videos from search, related, and playlist preview |

WebSocket add/play always checks embeddability (Redis-backed). With prefilter off, search/related behave as before.
