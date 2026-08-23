import type { YouTubeVideo } from '@vkara/youtube';

import { env } from '@/env';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { resolveApiBaseUrl } from './client/api-client';

type TikTokSearchResponse = {
    items: YouTubeVideo[];
    cursor: string | null;
    hasMore?: boolean;
    searchId?: string | null;
    error?: string;
};

async function postTikTokSearch(
    body: Record<string, unknown>,
    signal?: AbortSignal,
): Promise<TikTokSearchResponse> {
    const baseUrl = resolveApiBaseUrl(env.NEXT_PUBLIC_TIKTOK_API_URL);
    const path = '/tiktok/search';
    const url = baseUrl.startsWith('/')
        ? `${baseUrl}${path}`
        : new URL(path, baseUrl).toString();

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
    });

    let payload: TikTokSearchResponse | { error?: string } = {};
    try {
        payload = (await response.json()) as TikTokSearchResponse | { error?: string };
    } catch {
        payload = {};
    }

    if (!response.ok) {
        const message =
            typeof payload.error === 'string' && payload.error.length > 0
                ? payload.error
                : `API request failed (${response.status}) for ${path}`;
        throw new Error(message);
    }

    return payload as TikTokSearchResponse;
}

export async function searchTikTok({
    query,
    isKaraoke,
    continuation,
    searchId,
    signal,
}: {
    query: string;
    isKaraoke: boolean;
    continuation?: string | null;
    searchId?: string | null;
    signal?: AbortSignal;
}) {
    const searchQuery = `${isKaraoke ? 'karaoke ' : ''}${query}`.trim();
    const cursor = continuation ? Number(continuation) : undefined;
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) {
        throw new Error('deviceId is unavailable');
    }

    const data = await postTikTokSearch(
        {
            query: searchQuery,
            deviceId,
            ...(cursor !== undefined && Number.isFinite(cursor) && cursor > 0
                ? { cursor, searchId: searchId ?? undefined }
                : {}),
        },
        signal,
    );

    return {
        items: data.items,
        continuation: data.cursor,
        searchId: data.searchId ?? null,
    };
}
