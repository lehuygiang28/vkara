import { Video } from 'youtube-sr';

export type YouTubeVideo = ReturnType<Video['toJSON']> & {
    channel: {
        verified: boolean;
    };
};

export interface SearchResults {
    items?: YouTubeVideo[];
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}
