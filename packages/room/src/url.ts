/** Strip trailing slashes; optionally map http(s) to ws(s) for WebSocket endpoints. */
export function resolveUrl(url: string, isWebsocket = false): string {
    if (isWebsocket) {
        const wsUrl = url.replace(/(https?:\/\/)/, (scheme) =>
            scheme === 'https://' ? 'wss://' : 'ws://',
        );
        return wsUrl.replace(/\/$/, '');
    }
    return url.replace(/\/$/, '');
}

/** Resolve env/base URL to the room WebSocket endpoint (`…/ws`), without duplicating `/ws`. */
export function resolveWebSocketEndpoint(url: string): string {
    const resolved = resolveUrl(url, true);
    if (/\/ws$/i.test(resolved)) {
        return resolved;
    }
    return `${resolved}/ws`;
}
