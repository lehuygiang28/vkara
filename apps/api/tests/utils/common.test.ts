import type { YouTubeVideo } from '@vkara/youtube';
import type { Room } from '@vkara/room';
import { describe, expect, it, vi } from 'vitest';

import {
    cleanUpRoomField,
    generateRandomNumber,
    isNullish,
    sanitizeVideoForClient,
    shuffleArray,
} from '@/utils/common';

function video(id: string): YouTubeVideo & { channel?: { name: string; verified?: boolean } } {
    const thumbUrl = `https://example.com/${id}.jpg`;
    return {
        id,
        title: id,
        duration: 180,
        duration_formatted: '3:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${id}`,
        uploadedAt: '',
        views: 0,
        channel: { name: 'Legacy', verified: true },
        channels: [],
        thumbnails: [{ url: thumbUrl, width: 120, height: 90 }],
    };
}

describe('generateRandomNumber', () => {
    it('returns values within configured digit bounds', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(generateRandomNumber({ digits: 4 })).toBe(1000);

        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        expect(generateRandomNumber({ digits: 4 })).toBe(8992);
    });

    it('defaults to six digits', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(generateRandomNumber()).toBe(100_000);
    });
});

describe('shuffleArray', () => {
    it('returns input for empty, single, or non-array values', () => {
        expect(shuffleArray([])).toEqual([]);
        expect(shuffleArray([1])).toEqual([1]);
        expect(shuffleArray(null as never)).toBe(null);
    });

    it('swaps two-element arrays deterministically', () => {
        expect(shuffleArray([1, 2])).toEqual([2, 1]);
    });
});

describe('isNullish', () => {
    it('detects null and undefined only', () => {
        expect(isNullish(null)).toBe(true);
        expect(isNullish(undefined)).toBe(true);
        expect(isNullish(0)).toBe(false);
        expect(isNullish('')).toBe(false);
    });
});

describe('sanitizeVideoForClient', () => {
    it('normalizes legacy channel and thumbnails', () => {
        const sanitized = sanitizeVideoForClient(video('abc12345678'));

        expect(sanitized.channels).toEqual([{ name: 'Legacy', verified: true }]);
        expect('channel' in sanitized).toBe(false);
        expect(sanitized.thumbnails.length).toBeGreaterThan(0);
    });

    it('does not inject YouTube thumbnail slots into TikTok videos', () => {
        const tiktokThumb =
            'https://p16-common-sign.tiktokcdn.com/tos-alisg-i-photomode-sg/cover~tplv-photomode-image.jpeg';
        const sanitized = sanitizeVideoForClient({
            id: '7575874238628891922',
            title: 'photo post',
            duration: 0,
            duration_formatted: '',
            type: 'photo',
            url: 'https://www.tiktok.com/@user/video/7575874238628891922',
            uploadedAt: '',
            views: 1,
            channels: [{ name: 'User', verified: false }],
            thumbnails: [{ url: tiktokThumb, width: 540, height: 960 }],
            source: 'tiktok',
        });

        expect(sanitized.thumbnails).toHaveLength(1);
        expect(sanitized.thumbnails[0]?.url).toBe(tiktokThumb);
        expect(sanitized.thumbnails.some((entry) => entry.url.includes('ytimg.com'))).toBe(false);
    });
});

describe('cleanUpRoomField', () => {
    it('strips clients and sanitizes queue videos', () => {
        const room: Room = {
            id: '1234',
            clients: ['ws1'],
            videoQueue: [video('q1')],
            historyQueue: [],
            volume: 50,
            showQRInPlayer: true,
            captionsEnabled: false,
            captionsLanguage: 'vi',
            captionTracks: [],
            captionTracksVideoId: null,
            playingNow: video('now'),
            lastActivity: 0,
            creatorId: 'c1',
            isPlaying: true,
            currentTime: 0,
            tiktokPhotoIndex: 0,
            tiktokPhotoMaxIndex: 0,
        };

        const cleaned = cleanUpRoomField(room);

        expect(cleaned).not.toHaveProperty('clients');
        expect(cleaned.playingNow?.channels[0]?.name).toBe('Legacy');
        expect(cleaned.videoQueue[0]?.channels[0]?.name).toBe('Legacy');
    });
});
