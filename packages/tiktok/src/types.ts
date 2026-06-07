export type TikTokImagePost = {
    images?: Array<{
        imageURL?: { urlList?: string[] };
    }>;
    cover?: { imageURL?: { urlList?: string[] } };
    shareCover?: { imageURL?: { urlList?: string[] } };
    title?: string;
};

export type TikTokLiveRoomInfo = {
    roomId?: string;
    roomID?: string;
    status?: number;
    title?: string;
    cover?: string;
};

export type TikTokSearchItem = {
    id: string;
    desc: string;
    createTime: number;
    awemeType?: number;
    imagePost?: TikTokImagePost;
    liveRoomInfo?: TikTokLiveRoomInfo;
    video?: {
        duration: number;
        cover?: string;
        dynamicCover?: string;
        originCover?: string;
        zoomCover?: Record<string, string>;
        playAddr?: string | false;
    };
    author?: {
        uniqueId: string;
        nickname: string;
        roomId?: string | number;
        avatarThumb?: string;
        avatarMedium?: string;
        avatarLarger?: string;
    };
    stats?: {
        playCount: number;
        diggCount: number;
        commentCount: number;
        shareCount: number;
    };
};

export type TikTokVideo = {
    id: string;
    desc: string;
    createTime: number;
    duration: number;
    cover: string;
    /** All cover URLs returned by search (signed CDN variants). */
    coverUrls: string[];
    playUrl: string;
    isLive: boolean;
    isImagePost: boolean;
    /** Slides in a photo post (`imagePost.images.length`). */
    imageCount: number;
    author: {
        uniqueId: string;
        nickname: string;
    };
    stats: {
        playCount: number;
        diggCount: number;
        commentCount: number;
        shareCount: number;
    };
    url: string;
};

export type SearchItem = {
    type: number;
    item?: TikTokSearchItem;
    /** Live user cards in general search (when enabled). */
    lives?: {
        aweme_id?: string;
        group_id?: string;
        author?: TikTokSearchItem['author'];
        title?: string;
        cover?: string;
        room_id?: string;
        roomId?: string;
        user_count?: number;
    };
};

export type SearchResponse = {
    status_code: number;
    data?: SearchItem[];
    cursor?: number;
    has_more?: number;
    message?: string;
    rid?: string;
};
