import { resolveUrl } from '@vkara/shared-utils';

const API_URL = resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

type JsonRecord = Record<string, unknown>;

export async function apiPost<TResponse, TBody extends JsonRecord = JsonRecord>(
    path: string,
    body: TBody,
    signal?: AbortSignal,
): Promise<TResponse> {
    const url = new URL(path, API_URL);
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
