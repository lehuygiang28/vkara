export function getRequestIp(request: Request, fallback = '0.0.0.0'): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) {
            return first;
        }
    }
    return fallback;
}

export function readBearerToken(request: Request): string | undefined {
    const header = request.headers.get('authorization');
    if (!header) {
        return undefined;
    }
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match?.[1]?.trim() || undefined;
}
