import { resolveUrl } from '@/lib/utils';
import { YouTubeVideo } from '@/types/youtube.type';

const API_URL = resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export async function searchYoutube({
    query,
    isKaraoke,
    continuation,
}: {
    query: string;
    isKaraoke: boolean;
    continuation?: string | null;
}) {
    const url = new URL('/search', API_URL);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `${isKaraoke ? 'karaoke ' : ''}${query}`,
            ...(continuation ? { continuation } : {}),
        }),
    });
    const data = (await response.json()) as {
        items: YouTubeVideo[];
        continuation: string | null;
    };
    return {
        items: data.items,
        continuation: data.continuation,
    };
}

export async function getYoutubeSuggestions(query: string) {
    const url = new URL('/suggestions', API_URL);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    return (await response.json()) as string[];
}

export async function checkEmbeddableStatus(videoIds: string[]) {
    const url = new URL('/check-embeddable', API_URL);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds }),
    });
    return (await response.json()) as { videoId: string; canEmbed: boolean }[];
}

export async function getRelatedVideos(videoId: string) {
    const url = new URL('/related', API_URL);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
    });
    return (await response.json()) as YouTubeVideo[];
}
