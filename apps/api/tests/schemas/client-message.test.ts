import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';

import { wsClientMessageSchema } from '@/schemas/client-message';

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

describe('wsClientMessageSchema', () => {
    it('accepts minimal valid control messages', () => {
        expect(Value.Check(wsClientMessageSchema, { ...base, type: 'ping' })).toBe(true);
        expect(Value.Check(wsClientMessageSchema, { ...base, type: 'nextVideo' })).toBe(true);
        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'joinRoom',
                roomId: '1234',
            }),
        ).toBe(true);
    });

    it('rejects missing base fields', () => {
        expect(Value.Check(wsClientMessageSchema, { type: 'ping' })).toBe(false);
        expect(Value.Check(wsClientMessageSchema, { ...base, type: 'ping', id: 1 })).toBe(false);
        expect(
            Value.Check(wsClientMessageSchema, { ...base, type: 'ping', timestamp: 'now' }),
        ).toBe(false);
    });

    it('rejects unknown message types', () => {
        expect(Value.Check(wsClientMessageSchema, { ...base, type: 'hackRoom' })).toBe(false);
        expect(Value.Check(wsClientMessageSchema, { ...base, type: '' })).toBe(false);
    });

    it('rejects joinRoom without roomId', () => {
        expect(Value.Check(wsClientMessageSchema, { ...base, type: 'joinRoom' })).toBe(false);
        expect(
            Value.Check(wsClientMessageSchema, { ...base, type: 'joinRoom', roomId: 1234 }),
        ).toBe(false);
    });

    it('rejects addVideo with invalid video shape', () => {
        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'addVideo',
                video: { id: 'dQw4w9WgXcQ' },
            }),
        ).toBe(false);

        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'addVideo',
                video: {
                    ...validVideo(),
                    channels: [],
                },
            }),
        ).toBe(false);

        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'addVideo',
                video: {
                    ...validVideo(),
                    title: 123 as never,
                },
            }),
        ).toBe(false);

        expect(
            Value.Check(wsClientMessageSchema, {
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
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'setVolume',
                volume: 'loud',
            }),
        ).toBe(false);
        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'seek',
                time: '12',
            }),
        ).toBe(false);
        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'setShowQRInPlayer',
                show: 1,
            }),
        ).toBe(false);
    });

    it('rejects syncCaptionTracks without tracks array', () => {
        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'syncCaptionTracks',
                videoId: 'dQw4w9WgXcQ',
                tracks: 'bad',
            }),
        ).toBe(false);
    });

    it('accepts well-formed addVideo payload', () => {
        expect(
            Value.Check(wsClientMessageSchema, {
                ...base,
                type: 'addVideo',
                video: validVideo(),
            }),
        ).toBe(true);
    });
});
