# vkara MCP (v1)

v1 is a **factory**: validate, build URL, mint `once`, mint `joinToken`. It does **not** join WebSocket as a hidden participant and does not reuse the TV/browser `deviceId`.

Search stays on existing `POST /search` and `POST /tiktok/search`.

## Bind

Every tool echoes `{ roomId, displayName }`. Mutating `build_url` refuses a different `roomId` and refuses destructive keys (`clearQueue`, `kick`, …).

## HTTP

Base: `{API}/url-commands`

| POST | Body | Result |
|---|---|---|
| `/validate` | `{ query, bind }` | parsed document + bind |
| `/build-url` | `{ origin, path, command, bind }` | `{ url, bind }` |
| `/mint-once` | `{ bind }` | `{ once, bind }` |
| `/mint-join-token` | `{ bind, password? }` | `{ joinToken, roomId, exp, bind }` — password required when the room has one |

`bind` is `{ roomId: "4821", displayName: "Claude" }`. `path` is `/` \| `/en` \| `/tv` \| `/en/tv`.

## Cursor config

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

Prefer `mint-join-token` over putting a password in chat. First successful call should confirm `{ roomId, displayName }` before any queue/play URL is opened.
