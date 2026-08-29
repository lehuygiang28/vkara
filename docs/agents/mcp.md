# vkara MCP (v1)

v1 is a **factory**: validate, build URL, mint `once`, mint `joinToken`. It does **not** join WebSocket as a hidden participant and does not reuse the TV/browser `deviceId`.

Headless agents join with HTTP session + `queue` / `play` / `next`. Search stays on existing `POST /search` and `POST /tiktok/search`.

## Bind

Every tool echoes `{ roomId, displayName }`. Mutating `build_url` refuses a different `roomId` and refuses destructive keys (`clearQueue`, `kick`, …). HTTP commands use the Redis session room; `bind.roomId` is a confirm check only.

## HTTP factory

Base: `{API}/url-commands`

| POST | Body | Result |
|---|---|---|
| `/validate` | `{ query, bind }` | parsed document + bind |
| `/build-url` | `{ origin, path, command, bind }` | `{ url, bind }` |
| `/mint-once` | `{ bind }` | `{ once, bind }` |
| `/mint-join-token` | `{ bind, password? }` | `{ joinToken, roomId, exp, bind }` — **password required**; passwordless rooms are refused (same error as a missing room) |

`bind` is `{ roomId: "4821", displayName: "Claude" }`. `path` is `/` \| `/en` \| `/tv` \| `/en/tv`.

## HTTP room control (headless)

| Method | Path | Body / auth | Result |
|---|---|---|---|
| POST | `/session` | `{ bind, password? \| joinToken? }` | `{ sessionToken, exp, bind, room }` — never roomId-only |
| GET | `/session` | `Authorization: Bearer <sessionToken>` | snapshot (no password, no device ids) |
| POST | `/queue` | `{ bind, sessionToken, videoId, once, exp? }` | queue add |
| POST | `/play` | `{ bind, sessionToken, videoId, once, exp? }` | play now |
| POST | `/next` | `{ bind, sessionToken, once, exp? }` | skip |
| POST | `/leave` | `{ bind, sessionToken }` | remove this agent only |

Open rooms: a host mints `joinToken` over WebSocket (`mintJoinToken`). Do not call HTTP `/mint-join-token` without a password.

## Example MCP config (Cursor, Claude Desktop, …)

```json
{
  "mcpServers": {
    "vkara": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://127.0.0.1:8000/url-commands/validate"],
      "env": {
        "VKARA_ROOM_ID": "4821",
        "VKARA_DISPLAY_NAME": "Claude",
        "VKARA_ROOM_PASSWORD": ""
      }
    }
  }
}
```

Prefer a host-minted `joinToken` or the invite password on `POST /session`. First successful call should confirm `{ roomId, displayName }` before any queue/play.
