import type { PlaylistDetailsResponse, YouTubeVideo } from '@vkara/youtube';
import { apiPost } from './client/api-client';

export async function fetchPlaylistDetails(
    playlistUrlOrId: string,
    options?: { videoLimit?: number; fetchAll?: boolean },
    signal?: AbortSignal,
) {
    return apiPost<PlaylistDetailsResponse>(
        '/playlist',
        {
            playlistUrlOrId,
            ...(options?.videoLimit !== undefined ? { videoLimit: options.videoLimit } : {}),
            ...(options?.fetchAll !== undefined ? { fetchAll: options.fetchAll } : {}),
        },
        signal,
    );
}

export async function searchYoutube({
    query,
    isKaraoke,
    continuation,
    signal,
}: {
    query: string;
    isKaraoke: boolean;
    continuation?: string | null;
    signal?: AbortSignal;
}) {
    const data = await apiPost<{
        items: YouTubeVideo[];
        continuation: string | null;
    }>(
        '/search',
        {
            query: `${isKaraoke ? 'karaoke ' : ''}${query}`,
            ...(continuation ? { continuation } : {}),
        },
        signal,
    );

    return {
        items: data.items,
        continuation: data.continuation,
    };
}

export async function getYoutubeSuggestions(query: string, signal?: AbortSignal) {
    return apiPost<string[]>('/suggestions', { query }, signal);
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
