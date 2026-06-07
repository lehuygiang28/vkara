import { describe, expect, it } from 'vitest';

import { tiktokDurationSeconds, toQueueVideo } from '../src/to-queue-video';
import type { TikTokVideo } from '../src/types';

describe('tiktokDurationSeconds', () => {
    it('returns 0 for non-positive values', () => {
        expect(tiktokDurationSeconds(0)).toBe(0);
        expect(tiktokDurationSeconds(-12)).toBe(0);
    });

    it('keeps short clip lengths in seconds', () => {
        expect(tiktokDurationSeconds(15)).toBe(15);
        expect(tiktokDurationSeconds(58)).toBe(58);
        expect(tiktokDurationSeconds(111)).toBe(111);
    });

    it('keeps standard remix and max-upload lengths in seconds', () => {
        expect(tiktokDurationSeconds(180)).toBe(180);
        expect(tiktokDurationSeconds(600)).toBe(600);
    });

    it('keeps long mixtape metadata in seconds (search API)', () => {
        expect(tiktokDurationSeconds(1011)).toBe(1011);
        expect(tiktokDurationSeconds(2680)).toBe(2680);
        expect(tiktokDurationSeconds(2725)).toBe(2725);
        expect(tiktokDurationSeconds(3480)).toBe(3480);
    });

    it('converts millisecond payloads for short clips', () => {
        expect(tiktokDurationSeconds(15_000)).toBe(15);
        expect(tiktokDurationSeconds(180_000)).toBe(180);
        expect(tiktokDurationSeconds(600_000)).toBe(600);
    });
});

describe('toQueueVideo duration formatting', () => {
    const base: TikTokVideo = {
        id: '1',
        desc: 'Mixtape test',
        createTime: 0,
        duration: 2680,
        cover: '',
        coverUrls: [],
        playUrl: '',
        isLive: false,
        isImagePost: false,
        imageCount: 0,
        author: { uniqueId: 'u', nickname: 'User' },
        stats: { playCount: 0, diggCount: 0, commentCount: 0, shareCount: 0 },
        url: 'https://www.tiktok.com/@u/video/1',
    };

    it('formats long mixtape duration from search metadata', () => {
        const queue = toQueueVideo(base);
        expect(queue.duration).toBe(2680);
        expect(queue.duration_formatted).toBe('44:40');
    });

    it('formats three-minute remix duration', () => {
        const queue = toQueueVideo({ ...base, duration: 180 });
        expect(queue.duration).toBe(180);
        expect(queue.duration_formatted).toBe('03:00');
    });

    it('formats ten-minute cap duration', () => {
        const queue = toQueueVideo({ ...base, duration: 600 });
        expect(queue.duration).toBe(600);
        expect(queue.duration_formatted).toBe('10:00');
    });
});
