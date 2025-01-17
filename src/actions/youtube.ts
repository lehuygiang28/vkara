'use server';

import youtube from 'youtube-sr';
import { YouTubeVideo } from '../types/youtube.type';
import { cleanUpVideoField, resolveUrl } from '@/lib/utils';

// Function to get initial search results
export async function searchYouTube(query: string, isKaraoke: boolean): Promise<YouTubeVideo[]> {
    const searchQuery = `${isKaraoke ? 'karaoke' : ''} ${query}`;

    try {
        const youtubeSearchResults = await youtube.search(searchQuery, {
            limit: 30,
            type: 'video',
        });

        if (!youtubeSearchResults) {
            return [];
        }

        return youtubeSearchResults.map((video) => ({
            ...cleanUpVideoField(video),
            isEmbedChecked: false,
            canEmbed: false,
        }));
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return [];
    }
}

// Function to check embeddable status for a batch of videos
export async function checkEmbeddableStatus(
    videoIds: string[],
): Promise<{ videoId: string; canEmbed: boolean }[]> {
    try {
        const response = await fetch(
            `${resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')}/check-embed`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoIds }),
            },
        );

        return await response.json();
    } catch (error) {
        console.error('Error checking embeddable status:', error);
        return videoIds.map((id) => ({ videoId: id, canEmbed: false }));
    }
}

export async function getYoutubeSuggestions(query: string): Promise<string[]> {
    try {
        const getSuggestions = await youtube.getSuggestions(query);
        return getSuggestions;
    } catch {
        return [];
    }
}
