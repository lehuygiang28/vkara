import { YouTubeVideo } from '@/types/youtube.type';
import { apiPost } from './client/api-client';

export async function searchYoutube({
    query,
    isKaraoke,
    continuation,
}: {
    query: string;
    isKaraoke: boolean;
    continuation?: string | null;
}) {
    const data = await apiPost<{
        items: YouTubeVideo[];
        continuation: string | null;
    }>('/search', {
            query: `${isKaraoke ? 'karaoke ' : ''}${query}`,
            ...(continuation ? { continuation } : {}),
    });

    return {
        items: data.items,
        continuation: data.continuation,
    };
}

export async function getYoutubeSuggestions(query: string) {
    return apiPost<string[]>('/suggestions', { query });
}

export async function checkEmbeddableStatus(videoIds: string[]) {
    return apiPost<{ videoId: string; canEmbed: boolean }[]>('/check-embeddable', { videoIds });
}

export async function getRelatedVideos(
    videoId: string,
    continuation?: string | null,
): Promise<{ items: YouTubeVideo[]; continuation: string | null }> {
    const data = await apiPost<{
        items: YouTubeVideo[];
        continuation: string | null;
    }>('/related', {
            videoId,
            ...(continuation ? { continuation } : {}),
    });

    return {
        items: data.items,
        continuation: data.continuation,
    };
}
