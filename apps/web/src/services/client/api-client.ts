import { resolveUrl } from '@vkara/shared-utils';

const API_URL = resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

function buildApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (API_URL.startsWith('/')) {
        return `${API_URL}${normalizedPath}`;
    }
    return new URL(path, API_URL).toString();
}

type JsonRecord = Record<string, unknown>;

export async function apiPost<TResponse, TBody extends JsonRecord = JsonRecord>(
    path: string,
    body: TBody,
    signal?: AbortSignal,
): Promise<TResponse> {
    const url = buildApiUrl(path);
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
