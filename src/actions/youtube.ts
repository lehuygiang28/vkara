'use server';

import youtube from 'youtube-sr';
import { SearchResults } from '../types/youtube.type';
import { cleanUpVideoField, resolveUrl } from '@/lib/utils';

export async function searchYouTube(query: string, isKaraoke: boolean): Promise<SearchResults> {
    const searchQuery = `${isKaraoke ? 'karaoke' : ''} ${query}`;

    try {
        const youtubeSearchResults = await youtube.search(searchQuery, {
            limit: 30,
            type: 'video',
        });
        if (!youtubeSearchResults) {
            return { items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
        }

        const isCanEmbed = await fetch(
            `${resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')}/check-embed`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoIds: youtubeSearchResults.map((item) => item.id) }),
            },
        );

        const resultEmbed = (await isCanEmbed.json()) as { videoId: string; canEmbed: boolean }[];
        const items = youtubeSearchResults
            .filter((item) => {
                return resultEmbed.find((resItem) => resItem.videoId === item.id)?.canEmbed;
            })
            .map(cleanUpVideoField);

        return {
            items,
            pageInfo: {
                totalResults: youtubeSearchResults.length,
                resultsPerPage: youtubeSearchResults.length,
            },
        };
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
    }
}
