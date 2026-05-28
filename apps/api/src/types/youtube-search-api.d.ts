declare module 'youtube-search-api' {
    export type VideoSuggestion = {
        id: string;
        title: string;
        channelTitle: string;
        type: 'video';
        thumbnail: {
            url: string;
            width: number;
            height: number;
        }[];
        length: {
            simpleText: string;
        };
    };

    export interface VideoDetails {
        suggestion: VideoSuggestion[];
    }

    // Define the main export
    const youtubeSearch: {
        GetVideoDetails(videoId: string): Promise<VideoDetails>;
    };

    export default youtubeSearch;
}
