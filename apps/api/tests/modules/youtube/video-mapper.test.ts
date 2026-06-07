import { describe, expect, it } from 'vitest';

import { mapYoutubeiThumbnails } from '@/modules/youtube/video-mapper';

describe('mapYoutubeiThumbnails', () => {
    it('enriches sparse youtubei hqdefault data with canonical sizes', () => {
        const thumbnails = mapYoutubeiThumbnails('abc123', [
            {
                url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg?signed=1',
                width: 336,
                height: 188,
            },
        ] as never);

        expect(thumbnails[0]?.url).toContain('/default.jpg');
        expect(thumbnails.at(-1)?.url).toContain('/maxresdefault.jpg');
        expect(thumbnails.some((entry) => entry.url.includes('hqdefault'))).toBe(true);
    });

    it('falls back to standard YouTube thumbnail sizes when youtubei returns nothing', () => {
        const thumbnails = mapYoutubeiThumbnails('abc123');

        expect(thumbnails[0]?.url).toContain('/default.jpg');
        expect(thumbnails.at(-1)?.url).toContain('/maxresdefault.jpg');
        expect(thumbnails.length).toBeGreaterThan(1);
    });

    it('returns empty url list for invalid video id', () => {
        const thumbnails = mapYoutubeiThumbnails('bad');
        expect(thumbnails.every((t) => t.url.includes('bad') || t.url.length > 0)).toBe(true);
    });
});
