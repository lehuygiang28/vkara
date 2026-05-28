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
