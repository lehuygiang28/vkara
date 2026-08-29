import type { YouTubeVideo } from '@vkara/youtube';

import { searchFirstPage } from '@/lib/search-providers';

export async function hydrateVideoById(
    videoId: string,
    signal?: AbortSignal,
): Promise<YouTubeVideo | null> {
    const trimmed = videoId.trim();
    if (!trimmed) {
        return null;
    }
    try {
        const result = await searchFirstPage({
            query: trimmed,
            isKaraoke: false,
            signal: signal ?? new AbortController().signal,
        });
        return result.items.find((video) => video.id === trimmed) ?? null;
    } catch {
        return null;
    }
}
