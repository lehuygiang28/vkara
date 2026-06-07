import { describe, expect, it } from 'vitest';

import { getTikTokPhotoMaxIndex, isTikTokPhotoPost, isTikTokVideoLive } from '../src/video';
import { isVideoLive } from '../src/queue-item';

describe('getTikTokPhotoMaxIndex', () => {
    const photo = {
        id: '1',
        type: 'photo',
        source: 'tiktok' as const,
        url: 'https://www.tiktok.com/@u/video/1',
        tiktokImageCount: 5,
    };

    it('derives max index from tiktokImageCount metadata', () => {
        expect(getTikTokPhotoMaxIndex({ video: photo, roomMaxIndex: 0 })).toBe(4);
    });

    it('keeps the higher value between metadata and room sync', () => {
        expect(getTikTokPhotoMaxIndex({ video: photo, roomMaxIndex: 2 })).toBe(4);
        expect(getTikTokPhotoMaxIndex({ video: photo, roomMaxIndex: 6 })).toBe(6);
    });
});

describe('isVideoLive', () => {
    it('delegates to shared live heuristics for YouTube items', () => {
        expect(
            isVideoLive({
                video: {
                    isLive: true,
                    duration: 0,
                    uploadedAt: '',
                    url: 'https://www.youtube.com/watch?v=abc',
                },
            }),
        ).toBe(true);
        expect(
            isVideoLive({
                video: {
                    duration: 240,
                    uploadedAt: '2 days ago',
                    url: 'https://www.youtube.com/watch?v=abc',
                },
            }),
        ).toBe(false);
        expect(
            isVideoLive({
                video: { duration: 0, uploadedAt: '', url: 'https://www.youtube.com/watch?v=abc' },
            }),
        ).toBe(true);
    });

    it('only trusts explicit isLive for TikTok items', () => {
        expect(
            isVideoLive({
                video: {
                    source: 'tiktok',
                    url: 'https://www.tiktok.com/@user/video/1',
                    duration: 0,
                    uploadedAt: '',
                },
            }),
        ).toBe(false);
        expect(
            isTikTokVideoLive({
                video: {
                    source: 'tiktok',
                    url: 'https://www.tiktok.com/@user/live',
                    isLive: true,
                },
            }),
        ).toBe(true);
    });
});

describe('isTikTokPhotoPost', () => {
    it('detects TikTok photo carousel queue items', () => {
        expect(
            isTikTokPhotoPost({
                video: {
                    source: 'tiktok',
                    url: 'https://www.tiktok.com/@user/video/1',
                    type: 'photo',
                },
            }),
        ).toBe(true);
        expect(
            isTikTokPhotoPost({
                video: {
                    source: 'tiktok',
                    url: 'https://www.tiktok.com/@user/video/1',
                    type: 'video',
                },
            }),
        ).toBe(false);
    });
});
