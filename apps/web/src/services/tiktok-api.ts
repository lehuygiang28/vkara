import type { YouTubeVideo } from '@vkara/youtube';

import { env } from '@/env';
import { apiPost } from './client/api-client';

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

    const data = await apiPost<{
        items: YouTubeVideo[];
        cursor: string | null;
        hasMore?: boolean;
        searchId?: string | null;
    }>(
        '/tiktok/search',
        {
            query: searchQuery,
            ...(cursor !== undefined && Number.isFinite(cursor) && cursor > 0
                ? { cursor, searchId: searchId ?? undefined }
                : {}),
        },
        signal,
        { baseUrl: env.NEXT_PUBLIC_TIKTOK_API_URL },
    );

    return {
        items: data.items,
        continuation: data.cursor,
        searchId: data.searchId ?? null,
    };
}
