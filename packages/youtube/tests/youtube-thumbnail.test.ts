import { describe, expect, it } from 'vitest';

import {
    buildYouTubeThumbnails,
    getNextYouTubeThumbnailFallback,
    getYouTubeThumbnailFallbackChain,
    getYouTubeThumbnailSrcSet,
    getYouTubeThumbnailUrl,
    isYouTubeThumbnailPlaceholder,
    normalizeVideoThumbnails,
    youtubeCanonicalThumbnailUrl,
} from '../src/youtube-thumbnail';

describe('buildYouTubeThumbnails', () => {
    it('merges youtubei hqdefault with canonical maxresdefault sizes', () => {
        const thumbnails = buildYouTubeThumbnails('o5NHDzGV5o4', [
            {
                url: 'https://i.ytimg.com/vi/o5NHDzGV5o4/hqdefault.jpg?signed=1',
                width: 336,
                height: 188,
            },
        ]);

        expect(thumbnails[0]?.url).toContain('/default.jpg');
        expect(thumbnails.at(-1)?.url).toContain('/maxresdefault.jpg');
        expect(thumbnails.some((entry) => entry.url.includes('hqdefault'))).toBe(true);
    });

    it('prefers signed youtubei hq720 over canonical maxresdefault at the same size', () => {
        const thumbnails = buildYouTubeThumbnails('neTuy5h9lOw', [
            {
                url: 'https://i.ytimg.com/vi/neTuy5h9lOw/hq720.jpg?signed=1',
                width: 1280,
                height: 720,
            },
        ]);

        expect(thumbnails.some((entry) => entry.url.includes('hq720'))).toBe(true);
        expect(thumbnails.at(-1)?.url).toContain('hq720');
    });
});

describe('getYouTubeThumbnailUrl', () => {
    it('returns smallest for list and largest for controls', () => {
        const thumbnails = buildYouTubeThumbnails('abc123');

        expect(getYouTubeThumbnailUrl(thumbnails, 'list', 'abc123')).toContain('/mqdefault.jpg');
        expect(getYouTubeThumbnailUrl(thumbnails, 'large', 'abc123')).toContain(
            '/maxresdefault.jpg',
        );
    });

    it('uses largest known youtubei thumbnail for large when maxres is absent', () => {
        const sparse = [
            { url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg', width: 336, height: 188 },
        ];

        expect(getYouTubeThumbnailUrl(sparse, 'large', 'abc')).toContain('/hqdefault.jpg');
        expect(getYouTubeThumbnailUrl(sparse, 'list', 'abc')).toContain('/mqdefault.jpg');
    });

    it('falls back to sddefault for large when youtubei provides nothing', () => {
        expect(getYouTubeThumbnailUrl([], 'large', 'abc')).toContain('/sddefault.jpg');
    });
});

describe('normalizeVideoThumbnails', () => {
    it('fills canonical sizes from video id', () => {
        const normalized = normalizeVideoThumbnails(
            [{ url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg', width: 336, height: 188 }],
            'abc',
        );

        expect(normalized.length).toBeGreaterThan(2);
        expect(normalized.at(-1)?.url).toContain('/maxresdefault.jpg');
    });
});

describe('getYouTubeThumbnailSrcSet', () => {
    it('builds width descriptors for responsive images', () => {
        const srcSet = getYouTubeThumbnailSrcSet(buildYouTubeThumbnails('abc123'), 'abc123');

        expect(srcSet).toContain('120w');
        expect(srcSet).toContain('1280w');
    });

    it('omits synthetic maxres from srcSet when youtubei only has hqdefault', () => {
        const sparse = [
            { url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg', width: 480, height: 360 },
        ];
        const srcSet = getYouTubeThumbnailSrcSet(sparse, 'abc');

        expect(srcSet).toContain('480w');
        expect(srcSet).not.toContain('1280w');
    });
});

describe('getYouTubeThumbnailFallbackChain', () => {
    it('orders large slots from maxres down to default', () => {
        const chain = getYouTubeThumbnailFallbackChain('abc123', 'large');

        expect(chain[0]).toContain('/maxresdefault.jpg');
        expect(chain[1]).toContain('/sddefault.jpg');
        expect(chain[2]).toContain('/hqdefault.jpg');
    });

    it('orders list slots from mqdefault down', () => {
        const chain = getYouTubeThumbnailFallbackChain('abc123', 'list');

        expect(chain[0]).toContain('/mqdefault.jpg');
        expect(chain[1]).toContain('/hqdefault.jpg');
    });
});

describe('isYouTubeThumbnailPlaceholder', () => {
    it('detects YouTube 404 placeholder width for non-default slots', () => {
        const url = youtubeCanonicalThumbnailUrl('abc123', 'maxresdefault');

        expect(isYouTubeThumbnailPlaceholder(120, url)).toBe(true);
        expect(isYouTubeThumbnailPlaceholder(640, url)).toBe(false);
    });

    it('does not treat default slot as placeholder at 120px', () => {
        const url = youtubeCanonicalThumbnailUrl('abc123', 'default');

        expect(isYouTubeThumbnailPlaceholder(120, url)).toBe(false);
    });
});

describe('getNextYouTubeThumbnailFallback', () => {
    it('steps from maxresdefault to sddefault for large thumbnails', () => {
        const current = youtubeCanonicalThumbnailUrl('abc123', 'maxresdefault');
        const next = getNextYouTubeThumbnailFallback(current, 'abc123', 'large');

        expect(next).toContain('/sddefault.jpg');
    });

    it('steps from sddefault to hqdefault for large thumbnails', () => {
        const current = youtubeCanonicalThumbnailUrl('abc123', 'sddefault');
        const next = getNextYouTubeThumbnailFallback(current, 'abc123', 'large');

        expect(next).toContain('/hqdefault.jpg');
    });

    it('returns undefined after the last fallback slot', () => {
        const current = youtubeCanonicalThumbnailUrl('abc123', 'default');
        const next = getNextYouTubeThumbnailFallback(current, 'abc123', 'large');

        expect(next).toBeUndefined();
    });
});
