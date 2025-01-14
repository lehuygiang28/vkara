'use server';

import youtube from 'youtube-sr';
import { SearchResults } from '../types/youtube.type';

export async function searchYouTube(query: string, isKaraoke: boolean): Promise<SearchResults> {
    const searchQuery = `${isKaraoke ? 'karaoke' : ''} ${query}`;

    try {
        const results = await youtube.search(searchQuery);
        if (!results) {
            return { items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
        }

        const items = results.map((video) => video?.toJSON());
        console.log({ i: items[0] });
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
