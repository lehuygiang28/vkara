import { resolveUrl } from '@vkara/room';

import { env } from '@/env';

const DEFAULT_API_URL = 'http://localhost:8000';

/** Resolve REST API origin; optional override falls back to `NEXT_PUBLIC_API_URL`. */
export function resolveApiBaseUrl(override?: string | null): string {
    const base = override?.trim() || env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
    return resolveUrl(base);
}

const API_URL = resolveApiBaseUrl();

function buildApiUrl(path: string, baseUrl?: string | null): string {
    const apiUrl = baseUrl !== undefined ? resolveApiBaseUrl(baseUrl) : API_URL;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (apiUrl.startsWith('/')) {
        return `${apiUrl}${normalizedPath}`;
    }
    return new URL(path, apiUrl).toString();
}

type JsonRecord = Record<string, unknown>;

export type ApiPostOptions = {
    /** When set, use this origin instead of `NEXT_PUBLIC_API_URL` (empty → default API). */
    baseUrl?: string | null;
};

export async function apiPost<TResponse, TBody extends JsonRecord = JsonRecord>(
    path: string,
    body: TBody,
    signal?: AbortSignal,
    options?: ApiPostOptions,
): Promise<TResponse> {
    const url = buildApiUrl(path, options?.baseUrl);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
    });

    if (!response.ok) {
        throw new Error(`API request failed (${response.status}) for ${path}`);
    }

    return (await response.json()) as TResponse;
}
