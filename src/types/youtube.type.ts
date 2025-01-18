import { Video } from 'youtube-sr';
import { SearchType } from 'youtubei';

export interface SearchResults {
    items?: YouTubeVideo[];
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}

export type YouTubeVideo = Omit<
    ReturnType<Video['toJSON']>,
    | 'shorts_url'
    | 'description'
    | 'unlisted'
    | 'nsfw'
    | 'tags'
    | 'ratings'
    | 'shorts'
    | 'live'
    | 'private'
    | 'music'
    | 'channel'
    | 'thumbnail'
    | 'type'
> & {
    channel: {
        name: string;
        verified: boolean;
    };
    thumbnail: {
        url: string;
    };
    type: SearchType;
};
