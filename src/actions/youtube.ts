'use server';

import { SearchResults } from '../types/youtube.type';

const maxResults = 50;

export async function searchYouTube(
    query: string,
    isKaraoke: boolean,
    page = 1,
): Promise<SearchResults> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const searchQuery = `${query}${isKaraoke ? ' karaoke' : ''}`;
    let pageToken = '';
    if (page > 1) {
        const prevResults = await searchYouTube(query, isKaraoke, page - 1);
        pageToken = prevResults.nextPageToken || '';
    }

    try {
        const url = new URL(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
                searchQuery,
            )}&maxResults=${maxResults}&type=video&key=${apiKey}`,
        );
        if (pageToken) {
            url.searchParams.append('pageToken', pageToken);
        }

        const response = await fetch(url?.toString());
        const data = await response.json();
        return {
            items: data.items,
            nextPageToken: data.nextPageToken,
        };
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { items: [], nextPageToken: '' };
    }
}
