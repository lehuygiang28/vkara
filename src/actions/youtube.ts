'use server';

import youtube from 'youtube-sr';
import { SearchResults } from '../types/youtube.type';
import { resolveUrl } from '@/lib/utils';

export async function searchYouTube(query: string, isKaraoke: boolean): Promise<SearchResults> {
    const searchQuery = `${isKaraoke ? 'karaoke' : ''} ${query}`;

    try {
        let results = await youtube.search(searchQuery, {
            limit: 30,
            type: 'video',
        });
        if (!results) {
            return { items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
        }

        const isCanEmbed = await fetch(
            `${resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')}/check-embed`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoIds: results.map((item) => item.id) }),
            },
        );

        const resultEmbed = (await isCanEmbed.json()) as { videoId: string; canEmbed: boolean }[];
        results = results.filter((item) => {
            return resultEmbed.find((resItem) => resItem.videoId === item.id)?.canEmbed;
        });

        const items = results.map((video) => {
            const videoJSON = video.toJSON();
            const channelJSON = video.channel?.toJSON();

            return {
                ...videoJSON,
                channel: {
                    ...videoJSON.channel,
                    ...channelJSON,
                    verified: channelJSON?.verified || false,
                },
            };
        });

        return {
            items,
            pageInfo: {
                totalResults: results.length,
                resultsPerPage: results.length,
            },
        };
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
    }
}
