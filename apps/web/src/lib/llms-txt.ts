import { resolveUrl } from '@vkara/room';

const GITHUB = 'https://github.com/lehuygiang28/vkara/blob/main';

export type LlmsTxtOrigins = {
    appOrigin: string;
    apiOrigin: string;
};

/** Request-facing origin (respects reverse-proxy headers). */
export function getRequestAppOrigin(request: Request): string {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    if (forwardedHost) {
        const host = forwardedHost.split(',')[0]?.trim();
        const proto = forwardedProto?.split(',')[0]?.trim() || 'https';
        if (host) {
            return `${proto}://${host}`;
        }
    }
    return new URL(request.url).origin;
}

/**
 * Resolve API base URL for this deploy (no trailing slash).
 * Matches browser `resolveApiBaseUrl` semantics, but uses the live request origin for relative paths.
 */
export function resolveApiOriginForRequest(appOrigin: string): string {
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configured?.startsWith('/')) {
        return resolveUrl(`${appOrigin}${configured}`);
    }
    if (configured) {
        return resolveUrl(configured);
    }
    try {
        const { hostname, port } = new URL(appOrigin);
        if (hostname === 'localhost' && port === '3000') {
            return 'http://localhost:8000';
        }
    } catch {
        /* fall through */
    }
    return appOrigin;
}

export function resolveLlmsOriginsFromRequest(request: Request): LlmsTxtOrigins {
    const appOrigin = getRequestAppOrigin(request);
    return {
        appOrigin,
        apiOrigin: resolveApiOriginForRequest(appOrigin),
    };
}

export function buildLlmsTxtContent({ appOrigin, apiOrigin }: LlmsTxtOrigins): string {
    const app = resolveUrl(appOrigin);
    const api = resolveUrl(apiOrigin);
    const factory = `${api}/url-commands`;
    const llmsUrl = `${app}/llms.txt`;

    return `# vkara

> Shared karaoke rooms: one TV or laptop is the player, phones are remotes. No account. Guests scan a QR or type a 4-digit room code. Optional URL commands and an HTTP factory exist for power users and AI agents only.

vkara is a party app. Keep the guest path short: open the site, create or join, search, add a song. Do not ask non-technical people to edit query strings, mint tokens, or open MCP tools.

## This deployment

- **App origin:** ${app}
- **API origin:** ${api}
- **Factory base:** ${factory}
- **llms.txt:** ${llmsUrl}

## Agent onboarding (read this first)

Users invite you with a one-line message (host copies it from Settings → Mời tham gia):

- **VI:** \`Đọc ${llmsUrl} và vào phòng <roomId> để giúp tôi điều khiển phòng.\`
- **EN:** \`Read ${llmsUrl} and join room <roomId> to help me control the room.\`

They may append a task on the **same line** (e.g. \`… Thêm 3 bài kara của đạt k\`).

### Always do first

1. Fetch **this file** (\`${llmsUrl}\`). Follow links here only when a step is unclear.
2. Extract \`roomId\` (4 digits) from the user message.
3. **Join the room** as an agent: open a URL like \`${app}/?roomId=<roomId>&name=<YourName>&agent=1\` (add \`password=\` or mint \`joinToken\` via factory if the room is protected). Wait until the session is connected before queue/play/next.
4. Reply in the **same language** as the user (VI → Vietnamese, EN → English).

### Case A — invite only (no task)

If the message is **only** the invite line (no “thêm/chọn/tìm/play/skip/…” request):

- Do **not** search, queue, or play yet.
- Confirm you read this file and joined (or will join) the room.
- Reply with the **capability bullets** below so the user knows what to ask next.

**Example (VI):**

> Tôi đã đọc hướng dẫn và có thể giúp bạn điều khiển phòng 4821:
> - Tìm bài karaoke trên YouTube (mặc định) hoặc TikTok (khi bạn yêu cầu rõ)
> - Thêm bài vào hàng đợi
> - Phát bài ngay
> - Chuyển sang bài tiếp theo
> - Mở tab tìm kiếm, hàng đợi, lịch sử, điều khiển, hoặc cài đặt
> - Bật/tắt lọc karaoke khi tìm kiếm
>
> Bạn muốn tôi làm gì?

### Case B — invite + task

If the user adds a task on the same message (e.g. add N songs, play something, skip):

1. Complete **Always do first** (join + bind \`{ roomId, displayName }\`).
2. Execute the task using **Capabilities** and **Task recipes** below.
3. Reply with **concrete results** (song titles / video ids queued, errors, password needed).

**Example (VI):** after adding 3 Đạt K karaoke tracks → list the three titles and confirm they are in the queue.

### What you can do (tell the user — Case A bullets)

Use these bullets (adapt wording; keep the list complete):

| VI (user-facing) | EN (user-facing) |
|---|---|
| Tìm bài karaoke trên YouTube (mặc định) | Search karaoke on YouTube (default) |
| Tìm trên TikTok (chỉ khi bạn yêu cầu rõ) | Search TikTok (only when explicitly asked) |
| Thêm bài vào hàng đợi | Add songs to the queue |
| Phát bài ngay | Play a song immediately |
| Chuyển sang bài tiếp theo | Skip to the next song |
| Mở tab tìm kiếm / hàng đợi / lịch sử / điều khiển / cài đặt | Open search / queue / history / controls / settings tab |
| Bật hoặc tắt lọc karaoke khi tìm | Toggle karaoke filter while searching |

### What you cannot do (v1)

Do not promise these — they are **blocked** from URL commands and the HTTP factory:

- Xóa hàng đợi / lịch sử, kick, khóa/mở khóa phòng, đóng phòng, nhận host
- Clear queue/history, kick, lock/unlock room, close room, claim host

If the user asks, explain you can only join, search, queue, play, skip, and UI prefs via the supported URL surface.

### Task recipes (Case B)

**Search (pick video ids):**

- YouTube (default): \`POST ${api}/search\` body \`{ "query": "<artist> karaoke <song>" }\` → \`items[].id\`
- TikTok (explicit only): \`POST ${api}/tiktok/search\` with the same shape when the user asked for TikTok

Append \`karaoke\` to vague artist/song queries unless the user said otherwise.

**Add to queue (each song):**

1. \`POST ${factory}/mint-once\` body \`{ "bind": { "roomId": "<id>", "displayName": "<name>" } }\` → \`once\`
2. \`POST ${factory}/build-url\` body \`{ "origin": "${app}", "path": "/", "bind": {…}, "command": { "roomId": "<id>", "queue": "<videoId>", "once": "<once>", "name": "<name>" } }\` → \`url\`
3. Open \`url\` in the browser (or automation) **after** you are joined to that room. One \`once\` per mutation.

**Play now:** same as queue but \`play\` instead of \`queue\`.

**Skip:** \`command: { "roomId", "next": "1", "once", "name" }\`.

**Protected room:** \`POST ${factory}/mint-join-token\` with \`password\` if needed → join URL with \`joinToken=\` (never put password in chat if avoidable).

**Multi-song request:** repeat search → mint-once → build-url → open for each track; summarize all results in one reply.


- Phone: open the site (or scan the QR on the TV). Join with the 4-digit code. Password only if the host set one.
- TV: open \`${app}/tv\` (or the Tizen app). Create a room. Show the QR. Play.
- Human share/QR links are **only** \`roomId\` and optional \`password\`. Never add \`queue\`, \`play\`, \`next\`, \`layoutMode\`, or \`name\` to a guest invite.
- Compact in-app payload: \`vkara:<roomId>\` or \`vkara:<roomId>:<password>\`.

## Agents and power users

Optional query document. Missing keys are no-ops. Unknown keys are ignored. After apply, consumed keys are stripped (\`history.replace\`). Prefer a \`joinToken\` over putting a password in a URL.

### Search default

- **YouTube** is the default for vague song/artist/karaoke requests.
- Use **TikTok** only when the user explicitly asks for TikTok.
- In URL commands, omit \`provider\` or use \`provider=youtube\`. Set \`provider=tiktok\` only on explicit user request (TikTok needs experiments enabled).

Apply order: \`name\` → stash secrets → join → \`provider\` → \`karaoke\` → \`q\` → \`tab\` → \`layoutMode\` → wait session → \`queue\` / \`play\` / \`next\` → strip.

On \`/tv\` or \`/en/tv\`: join and \`name\` still apply; \`layoutMode\`, \`q\`, and \`tab\` are ignored. No focus steal, no success toast. \`play\` / \`queue\` / \`next\` still apply when \`roomId\` matches (automation).

### Catalog

- \`roomId\` — 4 digits
- \`password\` — human invite secret
- \`joinToken\` — 8–64 \`A-Za-z0-9_-\`; wins over \`password\`; single-use, Redis TTL 600s
- \`layoutMode\` — \`auto\` | \`remote\` | \`player\` | \`both\` (home only)
- \`q\` — search text (home only)
- \`karaoke\` — \`0\` | \`1\`
- \`provider\` — \`youtube\` (default) | \`tiktok\` (explicit user request only; needs experiments)
- \`name\` — max 40; required for agents and mutations
- \`tab\` — \`search\` | \`queue\` | \`history\` | \`controls\` | \`settings\` (home only)
- \`agent\` — \`1\` (requires \`name\`)
- \`queue\` / \`play\` — video id; needs \`roomId\` + \`once\` + \`name\`
- \`next\` — \`1\`; needs \`roomId\` + \`once\` + \`name\`
- \`once\` — 8–64 token; consume before WebSocket send
- \`exp\` — unix seconds; stale acts drop
- \`launch\` — TV cache-bust; reserved; never stripped

Never executed from the query: \`deviceId\`, \`closeRoom\`, \`leaveRoom\`, \`lockRoom\`, \`unlockRoom\`, \`kick\`, \`promote\`, \`demote\`, \`clearQueue\`, \`clearHistory\`, \`claimHost\`, \`redirect\`.

Mutations apply only when the live room id equals \`roomId\`. Wrong room = no act.

### Recipes

\`\`\`
${app}/?roomId=4821
${app}/en?roomId=4821&name=Claude&q=son+tung&karaoke=1
${app}/?roomId=4821&queue=<videoId>&once=<token>&name=Claude
${app}/tv?roomId=4821
\`\`\`

## HTTP factory (MCP v1)

Base: \`${factory}\`. v1 does **not** join WebSocket as a hidden participant.

- \`POST ${factory}/validate\` — \`{ query, bind }\` → parsed document + bind
- \`POST ${factory}/build-url\` — \`{ origin, path, command, bind }\` → \`{ url, bind }\`. Refuses \`password\` (mint \`joinToken\`). Refuses destructive keys and a different \`roomId\`.
- \`POST ${factory}/mint-once\` — \`{ bind }\` → \`{ once, bind }\`
- \`POST ${factory}/mint-join-token\` — \`{ bind, password? }\` → \`{ joinToken, roomId, exp, bind }\`. Password required when the room has one.

\`bind\` is \`{ roomId, displayName }\`. \`path\` is \`/\` | \`/en\` | \`/tv\` | \`/en/tv\`. \`origin\` in \`build-url\` is \`${app}\`. Echo bind before acting. Search: \`POST ${api}/search\` (YouTube, default) and \`POST ${api}/tiktok/search\` (explicit TikTok only).

## Docs

- [URL commands (EN)](${GITHUB}/docs/agents/url-commands.md): full catalog and apply order
- [MCP factory](${GITHUB}/docs/agents/mcp.md): Cursor / HTTP bind
- [URL commands (VI)](${GITHUB}/docs/vi/url-commands.md): tiếng Việt
- [Human README](${GITHUB}/README.md): guest usage, no-account karaoke

## Optional

- [Vietnamese README](${GITHUB}/docs/vi/README.md)
- [OpenSpec change](${GITHUB}/openspec/changes/url-command-surface): design and security specs
`;
}
