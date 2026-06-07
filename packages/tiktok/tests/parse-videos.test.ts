import { describe, expect, it } from 'vitest';

import { collectTikTokItemCoverUrls } from '../src/cover';
import { isTikTokItemLive } from '../src/is-live';
import { parseVideos } from '../src/parse-videos';
import { toQueueVideo } from '../src/to-queue-video';

const imagePostItem = {
    id: '7547206919400721684',
    desc: 'TikTok karaoke live is finally here',
    createTime: 1700000000,
    imagePost: {
        images: [
            {
                imageURL: {
                    urlList: [
                        'https://cdn.example/photo-a.jpeg',
                        'https://cdn.example/photo-b.jpeg',
                    ],
                },
            },
        ],
        cover: {
            imageURL: {
                urlList: ['https://cdn.example/cover.jpeg'],
            },
        },
    },
    video: {
        duration: 0,
        cover: '',
        playAddr: false,
    },
    author: {
        uniqueId: 'karaokeloversworldwide',
        nickname: 'Karaoke Lovers',
        avatarThumb: 'https://cdn.example/avatar.jpeg',
    },
    stats: {
        playCount: 1200,
        diggCount: 10,
        commentCount: 2,
        shareCount: 1,
    },
};

const liveItem = {
    id: '7123456789012345678',
    desc: 'Đang phát karaoke live',
    createTime: 1700000001,
    liveRoomInfo: {
        roomId: '7123456789012345678',
        status: 2,
        title: 'Karaoke live room',
        cover: 'https://cdn.example/live-cover.jpeg',
    },
    video: {
        duration: 0,
        playAddr: false,
    },
    author: {
        uniqueId: 'live.singer',
        nickname: 'Live Singer',
        roomId: '7123456789012345678',
        avatarMedium: 'https://cdn.example/live-avatar.jpeg',
    },
    stats: {
        playCount: 500,
        diggCount: 0,
        commentCount: 0,
        shareCount: 0,
    },
};

describe('isTikTokItemLive', () => {
    it('does not mark image posts as live', () => {
        expect(isTikTokItemLive(imagePostItem)).toBe(false);
    });

    it('marks active live rooms as live', () => {
        expect(isTikTokItemLive(liveItem)).toBe(true);
    });
});

describe('collectTikTokItemCoverUrls', () => {
    it('falls back to image post and author avatars when video cover is empty', () => {
        const urls = collectTikTokItemCoverUrls(imagePostItem);
        expect(urls).toContain('https://cdn.example/photo-a.jpeg');
        expect(urls).toContain('https://cdn.example/cover.jpeg');
        expect(urls).toContain('https://cdn.example/avatar.jpeg');
    });

    it('uses live room cover and author avatar for livestreams', () => {
        const urls = collectTikTokItemCoverUrls(liveItem);
        expect(urls).toContain('https://cdn.example/live-cover.jpeg');
        expect(urls).toContain('https://cdn.example/live-avatar.jpeg');
    });
});

describe('parseVideos', () => {
    it('parses image posts without marking them live', () => {
        const [video] = parseVideos([{ type: 1, item: imagePostItem }]);
        expect(video.isLive).toBe(false);
        expect(video.isImagePost).toBe(true);
        expect(video.imageCount).toBe(1);
        expect(video.cover).toBe('https://cdn.example/photo-a.jpeg');
        expect(video.url).toBe('https://www.tiktok.com/@karaokeloversworldwide/video/7547206919400721684');
    });

    it('parses livestreams with live URL and cover fallback', () => {
        const [video] = parseVideos([{ type: 1, item: liveItem }]);
        expect(video.isLive).toBe(true);
        expect(video.cover).toBe('https://cdn.example/live-cover.jpeg');
        expect(video.url).toBe('https://www.tiktok.com/@live.singer/live');
    });

    it('parses live user cards from general search', () => {
        const [video] = parseVideos([
            {
                type: 1,
                lives: {
                    aweme_id: '7999999999999999999',
                    author: { uniqueId: 'card.live', nickname: 'Card Live' },
                    title: 'Karaoke đang live',
                    cover: 'https://cdn.example/card-cover.jpeg',
                    room_id: '7555555555555555555',
                    user_count: 88,
                },
            },
        ]);

        expect(video.isLive).toBe(true);
        expect(video.url).toBe('https://www.tiktok.com/@card.live/live');
        expect(video.cover).toBe('https://cdn.example/card-cover.jpeg');
        expect(video.stats.playCount).toBe(88);
    });
});

describe('toQueueVideo', () => {
    it('sets explicit isLive false for TikTok image posts', () => {
        const [parsed] = parseVideos([{ type: 1, item: imagePostItem }]);
        const queue = toQueueVideo(parsed);
        expect(queue.isLive).toBe(false);
        expect(queue.source).toBe('tiktok');
        expect(queue.type).toBe('photo');
        expect(queue.duration).toBe(0);
        expect(queue.duration_formatted).toBe('');
        expect(queue.tiktokImageCount).toBe(1);
    });

    it('carries multi-slide image count into queue metadata', () => {
        const multiImageItem = {
            ...imagePostItem,
            imagePost: {
                ...imagePostItem.imagePost,
                images: [
                    { imageURL: { urlList: ['https://cdn.example/1.jpeg'] } },
                    { imageURL: { urlList: ['https://cdn.example/2.jpeg'] } },
                    { imageURL: { urlList: ['https://cdn.example/3.jpeg'] } },
                ],
            },
        };
        const [parsed] = parseVideos([{ type: 1, item: multiImageItem }]);
        const queue = toQueueVideo(parsed);
        expect(parsed.imageCount).toBe(3);
        expect(queue.tiktokImageCount).toBe(3);
    });

    it('sets explicit isLive true for TikTok livestreams', () => {
        const [parsed] = parseVideos([{ type: 1, item: liveItem }]);
        const queue = toQueueVideo(parsed);
        expect(queue.isLive).toBe(true);
        expect(queue.duration).toBe(0);
        expect(queue.duration_formatted).toBe('');
        expect(queue.type).toBe('live');
    });
});
