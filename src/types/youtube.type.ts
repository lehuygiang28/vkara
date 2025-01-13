import { Video } from 'scrape-youtube';

export interface YouTubeVideo extends Omit<Video, 'id'> {
    id: {
        videoId: string;
    };
    snippet: {
        title: string;
        channelTitle: string;
        thumbnails: {
            default: {
                url: string;
                width: number;
                height: number;
            };
        };
        publishedAt: string;
    };
}

export interface SearchResults {
    items?: YouTubeVideo[];
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}
