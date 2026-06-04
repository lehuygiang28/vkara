import { describe, expect, it } from 'vitest';

import { normalizePersistedRoom } from '../src/persisted-room';

describe('normalizePersistedRoom invalid / hostile blobs', () => {
    it('returns null without throwing for garbage roots', () => {
        expect(normalizePersistedRoom(null)).toBeNull();
        expect(normalizePersistedRoom(undefined)).toBeNull();
        expect(normalizePersistedRoom(42 as never)).toBeNull();
        expect(normalizePersistedRoom([] as never)).toBeNull();
    });

    it('coerces hostile numeric and array fields safely', () => {
        const normalized = normalizePersistedRoom({
            id: '1234',
            volume: Number.NaN,
            currentTime: Number.POSITIVE_INFINITY,
            videoQueue: 'not-an-array' as never,
            historyQueue: { hack: true } as never,
            captionTracks: 'tracks' as never,
        });

        expect(normalized?.id).toBe('1234');
        expect(normalized?.videoQueue).toEqual([]);
        expect(normalized?.historyQueue).toEqual([]);
        expect(normalized?.captionTracks).toEqual([]);
        expect(normalized?.volume).toBeNaN();
        expect(normalized?.currentTime).toBe(Number.POSITIVE_INFINITY);
    });

    it('does not throw on prototype-style keys', () => {
        const blob = Object.create(null) as Record<string, unknown>;
        blob.id = '5678';
        blob.__proto__ = { polluted: true };

        expect(() => normalizePersistedRoom(blob as never)).not.toThrow();
        expect(normalizePersistedRoom(blob as never)?.id).toBe('5678');
    });
});
