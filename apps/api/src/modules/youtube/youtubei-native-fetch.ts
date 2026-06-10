import { appendFile } from 'node:fs/promises';
import { URL, URLSearchParams } from 'node:url';

import type { Client } from 'youtubei';

import { youtubeOutboundFetch } from './youtube-outbound-fetch';

const PATCHED = Symbol('vkaraNativeFetchPatched');

type HttpRequestOptions = {
    data?: Record<string, unknown>;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    method?: string;
};

type YoutubeiHttpInternals = {
    baseUrl: string;
    cookie: string;
    defaultHeaders: Record<string, string>;
    defaultFetchOptions: Record<string, unknown> & { headers?: Record<string, string> };
    oauth: { enabled: boolean; token: string | null };
    authorizationPromise: Promise<void> | null;
    rawResponseLogPath?: string;
    parseCookie: (response: Response) => void;
    authorize: () => Promise<void>;
    request: (path: string, partialOptions: HttpRequestOptions) => Promise<{ data: unknown }>;
    [PATCHED]?: boolean;
};

/**
 * youtubei uses node-fetch → Node http/https. Route through Bun native fetch
 * (correct SNI; see oven-sh/bun#27890) with transient-error retry + fresh
 * sockets on retry (stale keep-alive pool on long-running servers).
 */
export function ensureYoutubeiNativeFetch(client: Client): void {
    const http = client.http as unknown as YoutubeiHttpInternals;
    if (http[PATCHED]) return;
    http[PATCHED] = true;

    http.request = async (path, partialOptions) => {
        const requiresAuth = new URL(`https://${http.baseUrl}/${path}`).pathname.endsWith('/player');
        if (http.authorizationPromise && requiresAuth) {
            await http.authorizationPromise;
        }

        const headers: Record<string, string> = {
            ...http.defaultHeaders,
            cookie: http.cookie,
            referer: `https://${http.baseUrl}/`,
            ...partialOptions.headers,
            ...http.defaultFetchOptions.headers,
        };

        if (http.oauth.enabled && requiresAuth) {
            http.authorizationPromise = http.authorize();
            await http.authorizationPromise;
            if (http.oauth.token) {
                headers.Authorization = `Bearer ${http.oauth.token}`;
                delete headers.cookie;
            }
        }

        let urlString: string;
        if (path.startsWith('http')) {
            const url = new URL(path);
            for (const [key, value] of Object.entries(partialOptions.params ?? {})) {
                url.searchParams.set(key, value);
            }
            urlString = url.toString();
        } else {
            urlString = `https://${http.baseUrl}/${path}?${new URLSearchParams(partialOptions.params)}`;
        }

        const response = await youtubeOutboundFetch(urlString, {
            method: partialOptions.method,
            headers,
            body: partialOptions.data ? JSON.stringify(partialOptions.data) : undefined,
        });

        const data = await response.json();

        if (http.rawResponseLogPath) {
            await appendFile(
                http.rawResponseLogPath,
                `${JSON.stringify({ url: urlString, response: data })}\n`,
            );
        }

        http.parseCookie(response);
        return { data };
    };
}
