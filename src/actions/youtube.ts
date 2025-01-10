'use server';

import { SearchResults } from '../types/youtube.type';

const maxResults = 12;

export async function searchYouTube(
    query: string,
    isKaraoke: boolean,
    pageToken?: string,
): Promise<SearchResults> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const searchQuery = `${isKaraoke ? ' karaoke' : ''} ${query}`;

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.append('part', 'snippet');
        url.searchParams.append('q', searchQuery);
        url.searchParams.append('maxResults', maxResults.toString());
        url.searchParams.append('type', 'video');
        url.searchParams.append('key', apiKey || '');

        if (pageToken) {
            url.searchParams.append('pageToken', pageToken);
        }

        const response = await fetch(url.toString());
        const data = await response.json();
        return {
            items: data.items || [],
            nextPageToken: data.nextPageToken || '',
            pageInfo: data.pageInfo || { totalResults: 0, resultsPerPage: 0 },
        };
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { items: [], nextPageToken: '', pageInfo: { totalResults: 0, resultsPerPage: 0 } };
    }
}
