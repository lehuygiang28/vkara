import { describe, expect, it } from 'vitest';
import type { YouTubeVideo } from '@vkara/youtube';

import { CABINET_VIDEO_LIMIT, parseCabinetVideos, toggleCabinetVideo } from '@/lib/cabinet';

function video(id: string, title = id): YouTubeVideo {
    return {
        id,
        title,
        duration: 180,
        duration_formatted: '3:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${id}`,
        uploadedAt: '',
        views: 0,
        channels: [{ name: 'Channel', verified: false }],
        thumbnails: [],
    };
}

describe('toggleCabinetVideo', () => {
    it('inserts a new song at the front', () => {
        const next = toggleCabinetVideo([video('b')], video('a'));
        expect(next.map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('removes a song that is already saved', () => {
        const next = toggleCabinetVideo([video('a'), video('b')], video('a'));
        expect(next.map((item) => item.id)).toEqual(['b']);
    });

    it('drops the oldest song past the limit', () => {
        const saved = Array.from({ length: CABINET_VIDEO_LIMIT }, (_, index) => video(`id-${index}`));
        const next = toggleCabinetVideo(saved, video('new'));

        expect(next).toHaveLength(CABINET_VIDEO_LIMIT);
        expect(next[0]?.id).toBe('new');
        expect(next.some((item) => item.id === 'id-0')).toBe(true);
        expect(next.some((item) => item.id === `id-${CABINET_VIDEO_LIMIT - 1}`)).toBe(false);
    });
});

describe('parseCabinetVideos', () => {
    it('keeps the first copy of an id and drops entries without an id', () => {
        const parsed = parseCabinetVideos([
            { id: 'a', title: 'first' },
            { title: 'missing id' },
            { id: 'a', title: 'second' },
            { id: 'b', title: 'other' },
        ]);

        expect(parsed.map((item) => item.title)).toEqual(['first', 'other']);
    });

    it('keeps the TikTok photo count', () => {
        const parsed = parseCabinetVideos([
            {
                id: '7123456789012345678',
                title: 'photo',
                source: 'tiktok',
                type: 'video',
                url: 'https://www.tiktok.com/@name/photo/7123456789012345678',
                tiktokImageCount: 3,
            },
        ]);

        expect(parsed[0]?.tiktokImageCount).toBe(3);
    });

    it('skips a row whose type is not a string', () => {
        const parsed = parseCabinetVideos([
            { id: 'bad', type: 42 },
            { id: 'good', title: 'kept' },
        ]);

        expect(parsed.map((item) => item.id)).toEqual(['good']);
    });

    it('returns an empty list for a non-array', () => {
        expect(parseCabinetVideos({ videos: [] })).toEqual([]);
    });
});
