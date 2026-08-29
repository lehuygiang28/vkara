import { describe, expect, it } from 'vitest';

import { DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import { normalizePersistedRoom } from '../src/persisted-room';

describe('normalizePersistedRoom', () => {
    it('returns null for missing or invalid room id', () => {
        expect(normalizePersistedRoom(null)).toBeNull();
        expect(normalizePersistedRoom(undefined)).toBeNull();
        expect(normalizePersistedRoom({})).toBeNull();
        expect(normalizePersistedRoom({ id: '' })).toBeNull();
    });

    it('backfills arrays and defaults for legacy payloads', () => {
        const normalized = normalizePersistedRoom({
            id: '1234',
            volume: 150,
        });

        expect(normalized).toMatchObject({
            id: '1234',
            videoQueue: [],
            historyQueue: [],
            volume: 100,
            showQRInPlayer: true,
            captionsEnabled: false,
            captionsLanguage: DEFAULT_CAPTION_LANGUAGE,
            captionTracks: [],
            captionTracksVideoId: null,
            playingNow: null,
            isPlaying: false,
            currentTime: 0,
            tiktokPhotoIndex: 0,
            tiktokPhotoMaxIndex: 0,
            creatorId: '',
            locked: false,
            participants: {},
            hostDeviceId: '',
        });
        expect(normalized?.lastActivity).toEqual(expect.any(Number));
    });

    it('backfills participants and lock fields for legacy payloads', () => {
        const normalized = normalizePersistedRoom({
            id: '1234',
            participants: {
                d1: {
                    deviceId: 'd1',
                    displayName: 'Remote #1',
                    role: 'host',
                    joinedAt: 1,
                    lastSeen: 2,
                    connectionIds: ['ws1'],
                    isTvConnection: false,
                    isAgent: true,
                },
            },
            locked: true,
            hostDeviceId: 'd1',
        });

        expect(normalized?.locked).toBe(true);
        expect(normalized?.hostDeviceId).toBe('d1');
        expect(normalized?.participants.d1?.role).toBe('host');
        expect(normalized?.participants.d1?.connectionIds).toEqual(['ws1']);
        expect(normalized?.participants.d1?.isAgent).toBe(true);
    });

    it('defaults isAgent to false when missing on legacy participants', () => {
        const normalized = normalizePersistedRoom({
            id: '1234',
            participants: {
                d1: {
                    deviceId: 'd1',
                    displayName: 'TV',
                    role: 'member',
                    joinedAt: 1,
                    lastSeen: 2,
                    connectionIds: [],
                    isTvConnection: true,
                },
            },
        });

        expect(normalized?.participants.d1?.isAgent).toBe(false);
    });

    it('clamps volume to 0–100 and preserves explicit fields', () => {
        const normalized = normalizePersistedRoom({
            id: '5678',
            videoQueue: [{ id: 'v1' } as never],
            volume: -10,
            showQRInPlayer: false,
            captionsEnabled: true,
            captionsLanguage: 'en',
            currentTime: 42,
            creatorId: 'host',
        });

        expect(normalized?.volume).toBe(0);
        expect(normalized?.videoQueue).toHaveLength(1);
        expect(normalized?.showQRInPlayer).toBe(false);
        expect(normalized?.captionsEnabled).toBe(true);
        expect(normalized?.captionsLanguage).toBe('en');
        expect(normalized?.currentTime).toBe(42);
        expect(normalized?.creatorId).toBe('host');
    });

    it('rejects non-object and non-string id values', () => {
        expect(normalizePersistedRoom('1234' as never)).toBeNull();
        expect(normalizePersistedRoom({ id: 1234 as never })).toBeNull();
    });

    it('coerces non-array queues to empty arrays', () => {
        const normalized = normalizePersistedRoom({
            id: '9999',
            videoQueue: 'bad' as never,
            historyQueue: null as never,
        });

        expect(normalized?.videoQueue).toEqual([]);
        expect(normalized?.historyQueue).toEqual([]);
    });

    it('keeps falsy captionsLanguage as default when empty string', () => {
        const normalized = normalizePersistedRoom({
            id: '1111',
            captionsLanguage: '',
        });

        expect(normalized?.captionsLanguage).toBe(DEFAULT_CAPTION_LANGUAGE);
    });
});
