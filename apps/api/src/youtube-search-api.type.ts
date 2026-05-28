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
