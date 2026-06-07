import { describe, expect, it } from 'vitest';

import {
    getTikTokThumbnailUrl,
    normalizeTikTokThumbnails,
    pickTikTokThumbnailUrl,
} from '../src/thumbnails';
import { getVideoThumbnailUrl as resolveVideoThumbnailUrl } from '../src/thumbnails-resolver';

describe('normalizeTikTokThumbnails', () => {
    it('keeps only TikTok CDN thumbnails', () => {
        const tiktokUrl =
            'https://p16-common-sign.tiktokcdn.com/tos-alisg-i-photomode-sg/cover~tplv-photomode-image.jpeg';
        const normalized = normalizeTikTokThumbnails([
            { url: tiktokUrl, width: 540, height: 960 },
            {
                url: 'https://i.ytimg.com/vi/7575874238628891922/maxresdefault.jpg',
                width: 1280,
                height: 720,
            },
        ]);

        expect(normalized).toHaveLength(1);
        expect(normalized[0]?.url).toBe(tiktokUrl);
    });
});

describe('pickTikTokThumbnailUrl', () => {
    it('ignores synthetic YouTube thumbnails mixed into TikTok payloads', () => {
        const tiktokUrl =
            'https://p19-common-sign.tiktokcdn.com/tos-alisg-i-photomode-sg/cover~tplv-photomode-image.jpeg';
        const picked = pickTikTokThumbnailUrl({
            thumbnails: [
                {
                    url: 'https://i.ytimg.com/vi/7575874238628891922/maxresdefault.jpg',
                    width: 1280,
                    height: 720,
                },
                { url: tiktokUrl, width: 540, height: 960 },
            ],
        });

        expect(picked).toBe(tiktokUrl);
    });
});

describe('getVideoThumbnailUrl (TikTok resolver)', () => {
    it('returns TikTok CDN art for room-synced videos', () => {
        const tiktokUrl =
            'https://p19-common-sign.tiktokcdn.com/tos-alisg-i-photomode-sg/cover~tplv-photomode-image.jpeg';
        const url = resolveVideoThumbnailUrl({
            video: {
                id: '7575874238628891922',
                source: 'tiktok',
                url: 'https://www.tiktok.com/@user/video/7575874238628891922',
                thumbnails: [
                    {
                        url: 'https://i.ytimg.com/vi/7575874238628891922/maxresdefault.jpg',
                        width: 1280,
                        height: 720,
                    },
                    { url: tiktokUrl, width: 540, height: 960 },
                ],
            },
            size: 'list',
        });

        expect(url).toBe(tiktokUrl);
    });
});

describe('getTikTokThumbnailUrl', () => {
    it('returns empty string for non-TikTok videos', () => {
        expect(
            getTikTokThumbnailUrl({
                video: {
                    source: 'youtube',
                    url: 'https://www.youtube.com/watch?v=abc',
                    thumbnails: [],
                },
            }),
        ).toBe('');
    });
});
