export interface YouTubeVideo {
    id: {
        videoId: string;
    };
    snippet: {
        title: string;
        channelTitle: string;
        thumbnails: {
            default: {
                url: string;
            };
        };
        publishedAt: string;
    };
}

export interface SearchResults {
    items?: YouTubeVideo[];
    nextPageToken: string;
}
