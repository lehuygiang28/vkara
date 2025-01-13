'use server';

import { SearchResults } from '../types/youtube.type';
import scrapeYt, { ResultType } from 'scrape-youtube';

export async function searchYouTube(query: string, isKaraoke: boolean): Promise<SearchResults> {
    const searchQuery = `${isKaraoke ? 'karaoke' : ''} ${query}`;

    try {
        // Can switch to youtube official API
        const results = await scrapeYt.search(searchQuery, { type: ResultType.video });

        // Transform the results to match our expected format
        const items = results.videos.map((video) => ({
            ...video,
            id: { videoId: video.id },
            snippet: {
                title: video.title,
                channelTitle: video.channel.name,
                thumbnails: {
                    default: {
                        url: video.thumbnail,
                        width: 120,
                        height: 90,
                    },
                },
                publishedAt: video.uploaded,
            },
        }));

        return {
            items,
            pageInfo: {
                totalResults: results.videos.length,
                resultsPerPage: items.length,
            },
        };
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
    }
}
