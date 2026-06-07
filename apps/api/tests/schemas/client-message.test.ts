import { describe, expect, it } from 'vitest';

import { wsClientMessageSchema } from '@vkara/validators/ws/client-message';

const base = { id: 'client-msg-1', timestamp: 1_700_000_000_000 };

function validVideo() {
    return {
        id: 'dQw4w9WgXcQ',
        duration: 180,
        duration_formatted: '3:00',
        title: 'Test Song',
        type: 'video',
        uploadedAt: '1 day ago',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        views: 1000,
        channels: [{ name: 'Artist', verified: false }],
        thumbnails: [{ url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' }],
    };
}

function check(payload: unknown): boolean {
    return wsClientMessageSchema.safeParse(payload).success;
}

describe('wsClientMessageSchema', () => {
    it('accepts minimal valid control messages', () => {
        expect(check({ ...base, type: 'ping' })).toBe(true);
        expect(check({ ...base, type: 'nextVideo' })).toBe(true);
        expect(
            check({
                ...base,
                type: 'joinRoom',
                roomId: '1234',
            }),
        ).toBe(true);
    });

    it('rejects missing base fields', () => {
        expect(check({ type: 'ping' })).toBe(false);
        expect(check({ ...base, type: 'ping', id: 1 })).toBe(false);
        expect(check({ ...base, type: 'ping', timestamp: 'now' })).toBe(false);
    });

    it('rejects unknown message types', () => {
        expect(check({ ...base, type: 'hackRoom' })).toBe(false);
        expect(check({ ...base, type: '' })).toBe(false);
    });

    it('rejects joinRoom without roomId', () => {
        expect(check({ ...base, type: 'joinRoom' })).toBe(false);
        expect(check({ ...base, type: 'joinRoom', roomId: 1234 })).toBe(false);
    });

    it('rejects addVideo with invalid video shape', () => {
        expect(
            check({
                ...base,
                type: 'addVideo',
                video: { id: 'dQw4w9WgXcQ' },
            }),
        ).toBe(false);

        expect(
            check({
                ...base,
                type: 'addVideo',
                video: {
                    ...validVideo(),
                    channels: [],
                },
            }),
        ).toBe(false);

        expect(
            check({
                ...base,
                type: 'addVideo',
                video: {
                    ...validVideo(),
                    title: 123 as never,
                },
            }),
        ).toBe(false);

        expect(
            check({
                ...base,
                type: 'addVideo',
                video: {
                    ...validVideo(),
                    duration: 'long' as never,
                },
            }),
        ).toBe(false);
    });

    it('rejects playback messages with wrong field types', () => {
        expect(
            check({
                ...base,
                type: 'setVolume',
                volume: 'loud',
            }),
        ).toBe(false);
        expect(
            check({
                ...base,
                type: 'seek',
                time: '12',
            }),
        ).toBe(false);
        expect(
            check({
                ...base,
                type: 'setShowQRInPlayer',
                show: 1,
            }),
        ).toBe(false);
    });

    it('rejects syncCaptionTracks without tracks array', () => {
        expect(
            check({
                ...base,
                type: 'syncCaptionTracks',
                videoId: 'dQw4w9WgXcQ',
                tracks: 'bad',
            }),
        ).toBe(false);
    });

    it('accepts TikTok photo navigation messages', () => {
        expect(
            check({
                ...base,
                type: 'tiktokNavigatePhoto',
                index: 2,
                videoId: '7123456789012345678',
            }),
        ).toBe(true);
        expect(
            check({
                ...base,
                type: 'syncTikTokPhotoIndex',
                index: 1,
                maxIndex: 3,
                videoId: '7123456789012345678',
            }),
        ).toBe(true);
    });

    it('accepts well-formed addVideo payload', () => {
        expect(
            check({
                ...base,
                type: 'addVideo',
                video: validVideo(),
            }),
        ).toBe(true);
    });
});
