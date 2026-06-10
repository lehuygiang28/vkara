const TRANSIENT_FETCH_CODES = new Set([
    'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR',
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
]);

const TRANSIENT_FETCH_MESSAGE = /certificate|socket connection was closed|tls|ssl|connection reset/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const direct = (error as { code?: string }).code;
    if (typeof direct === 'string') return direct;
    const cause = (error as { cause?: unknown }).cause;
    if (cause && typeof cause === 'object') {
        const nested = (cause as { code?: string }).code;
        if (typeof nested === 'string') return nested;
    }
    return undefined;
}

/** Bun fetch can throw transient TLS/socket errors after long-lived keep-alive pools go stale. */
export function isTransientYoutubeFetchError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const code = readErrorCode(error);
    if (code && TRANSIENT_FETCH_CODES.has(code)) return true;
    return TRANSIENT_FETCH_MESSAGE.test(error.message);
}

type YoutubeOutboundFetchOptions = RequestInit & {
    /** Retry count after the first attempt (default 2 → 3 total tries). */
    retries?: number;
};

/**
 * Outbound fetch for YouTube / InnerTube with safe retry.
 * Retries use `keepalive: false` to avoid Bun's stale pooled TLS sockets.
 */
export async function youtubeOutboundFetch(
    url: string | URL,
    init: YoutubeOutboundFetchOptions = {},
): Promise<Response> {
    const { retries = 2, ...requestInit } = init;
    const maxAttempts = retries + 1;

    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fetch(url, {
                ...requestInit,
                keepalive: attempt === 0 ? requestInit.keepalive : false,
            });
        } catch (error) {
            lastError = error;
            if (!isTransientYoutubeFetchError(error) || attempt >= maxAttempts - 1) {
                throw error;
            }
            await sleep(50 * 2 ** attempt + Math.random() * 50);
        }
    }

    throw lastError;
}
