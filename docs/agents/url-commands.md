# URL commands

Optional query keys so humans and AI agents can join and act without extra UI. Missing keys are no-ops. After apply, consumed keys are stripped (`history.replace`). Session continues in localStorage. Agents should start at `/llms.txt` (dynamic route; origins filled from the running deploy) ([llms.txt spec](https://llmstxt.org/)).

**Security:** `password` and `joinToken` are secrets (history, screenshots, Referer). Prefer minting a `joinToken` via MCP/API. Mutating acts require `roomId` matching the live room plus a one-time `once` token. `/tv` does not change layout from query. `deviceId` and host-destructive verbs are ignored.

## Apply order

`name` → stash secrets → join → `provider` → `karaoke` → `q` → `tab` → `layoutMode` → wait session → `queue` / `play` / `next` → strip.

On `/tv` or `/en/tv`: join and `name` still apply; `layoutMode`, `q`, and `tab` are ignored. No focus steal, no success toast.

## Catalog

| Key | Values | Group |
|---|---|---|
| `roomId` | 4 digits | identity |
| `password` | string | identity (human invite) |
| `joinToken` | 8–64 `A-Za-z0-9_-` | identity (wins over password) |
| `layoutMode` | `auto` \| `remote` \| `player` \| `both` | session (home only) |
| `q` | search text | session (home only) |
| `karaoke` | `0` \| `1` | session |
| `provider` | `youtube` \| `tiktok` | session (TikTok needs experiments) |
| `name` | max 40 | session; required for agents / mutations |
| `tab` | `search` \| `queue` \| `history` \| `controls` \| `settings` | session (home only) |
| `agent` | `1` | requires `name`; marks participant as **Agent** in the room list (also set when joining with `joinToken`) |
| `queue` / `play` | video id | one-shot; needs `roomId` + `once` |
| `next` | `1` | one-shot; needs `roomId` + `once` |
| `once` | 8–64 token | consume before send |
| `exp` | unix seconds | optional; stale acts drop |
| `launch` | TV shell cache-bust | reserved; never stripped |

Human share/QR URLs stay `roomId` + optional `password` only.

## Recipes

```text
# Join
https://vkara.example/?roomId=4821

# Agent label
https://vkara.example/en?roomId=4821&password=<room-password>&name=Claude

# Search karaoke (no queue mutation)
https://vkara.example/?roomId=4821&q=tinh+yeu+xanh&karaoke=1&provider=youtube

# One-shot queue add
https://vkara.example/?roomId=4821&queue=xxxxxxxxxxx&once=a1b2c3d4&name=Claude

# TV player (path is the layout command)
https://vkara.example/tv?roomId=4821
https://vkara.example/en/tv?roomId=4821
```

MCP connect: [mcp.md](./mcp.md).
