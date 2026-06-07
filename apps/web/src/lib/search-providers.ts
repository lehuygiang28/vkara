import type { YouTubeVideo } from '@vkara/youtube';
import { rankVideos } from '@vkara/personalization';

import { searchTikTok } from '@/services/tiktok-api';
import { searchYoutube } from '@/services/youtube-api';
import { isTikTokProviderActive } from '@/lib/video-provider';
import { getPersonalizationProfile } from '@/store/personalizationStore';
import { useYouTubeStore } from '@/store/youtubeStore';

export type SearchPageResult = {
    items: YouTubeVideo[];
    continuation: string | null;
    /** TikTok-only pagination session id. */
    searchId: string | null;
};

const personalizeYoutubeResults = ({
    items,
    query,
    isKaraoke,
}: {
    items: YouTubeVideo[];
    query: string;
    isKaraoke: boolean;
}): YouTubeVideo[] => {
    const roomHistory = useYouTubeStore.getState().room?.historyQueue ?? [];
    return rankVideos(items, getPersonalizationProfile(), {
        query,
        isKaraoke,
        roomHistory: roomHistory.map((video) => ({
            id: video.id,
            title: video.title,
            channels: video.channels,
        })),
    });
};

export async function searchFirstPage({
    query,
    isKaraoke,
    signal,
}: {
    query: string;
    isKaraoke: boolean;
    signal: AbortSignal;
}): Promise<SearchPageResult> {
    if (isTikTokProviderActive()) {
        const result = await searchTikTok({ query, isKaraoke, signal });
        return {
            items: result.items,
            continuation: result.continuation,
            searchId: result.searchId,
        };
    }

    const result = await searchYoutube({ query, isKaraoke, signal });
    return {
        items: personalizeYoutubeResults({ items: result.items, query, isKaraoke }),
        continuation: result.continuation,
        searchId: null,
    };
}

export async function searchNextPage({
    query,
    isKaraoke,
    continuation,
    existingIds,
    tiktokSearchId,
}: {
    query: string;
    isKaraoke: boolean;
    continuation: string;
    existingIds: Set<string>;
    tiktokSearchId: string | null;
}): Promise<SearchPageResult> {
    if (isTikTokProviderActive()) {
        const result = await searchTikTok({
            query,
            isKaraoke,
            continuation,
            searchId: tiktokSearchId,
        });
        return {
            items: result.items.filter((video) => !existingIds.has(video.id)),
            continuation: result.continuation,
            searchId: result.searchId ?? tiktokSearchId,
        };
    }

    const result = await searchYoutube({ query, isKaraoke, continuation });
    const newItems = result.items.filter((video) => !existingIds.has(video.id));
    return {
        items: personalizeYoutubeResults({ items: newItems, query, isKaraoke }),
        continuation: result.continuation,
        searchId: null,
    };
}

export function canLoadMoreSearchPages({
    tiktokSearchId,
}: {
    tiktokSearchId: string | null;
}): boolean {
    if (!isTikTokProviderActive()) {
        return true;
    }
    return Boolean(tiktokSearchId);
}

export function supportsSearchSuggestions(): boolean {
    return !isTikTokProviderActive();
}
