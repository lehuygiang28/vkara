import { DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import { normalizePersistedRoom } from '@vkara/room';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createMigratingPersistStorage,
    PERSIST_STORE_KEYS,
    runLegacyLocalStorageKeyMigration,
} from '@/lib/persisted-storage';

describe('normalizePersistedRoom', () => {
    it('backfills caption and QR fields on legacy room blobs', () => {
        const normalized = normalizePersistedRoom({
            id: 'ROOM01',
            videoQueue: [],
            historyQueue: [],
            volume: 80,
            playingNow: null,
            isPlaying: false,
            currentTime: 0,
            lastActivity: 1,
            creatorId: 'c1',
        });

        expect(normalized).toMatchObject({
            id: 'ROOM01',
            showQRInPlayer: true,
            captionsEnabled: false,
            captionsLanguage: DEFAULT_CAPTION_LANGUAGE,
            captionTracks: [],
            captionTracksVideoId: null,
            tiktokPhotoIndex: 0,
            tiktokPhotoMaxIndex: 0,
        });
    });

    it('returns null when room id is missing', () => {
        expect(normalizePersistedRoom({ videoQueue: [] })).toBeNull();
    });

    it('builds a cold rejoin stub when only id/password are supplied (youtube persist merge path)', () => {
        const normalized = normalizePersistedRoom({
            id: 'ROOM99',
            password: 'secret',
            hasPassword: true,
        });

        expect(normalized).toMatchObject({
            id: 'ROOM99',
            hasPassword: true,
            password: 'secret',
            currentTime: 0,
            isPlaying: false,
            videoQueue: [],
            playingNow: null,
        });
    });
});

describe('createMigratingPersistStorage', () => {
    const storage = createMapStorage();

    beforeEach(() => {
        storage.clear();
        vi.stubGlobal('localStorage', storage);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('migrates legacy youtube-storage and rewrites version', async () => {
        const legacyEnvelope = {
            state: {
                room: {
                    id: 'ROOM01',
                    videoQueue: [],
                    historyQueue: [],
                    volume: 50,
                    playingNow: null,
                    isPlaying: true,
                    currentTime: 12,
                    lastActivity: 1,
                    creatorId: 'x',
                },
            },
            version: 0,
        };
        storage.setItem(PERSIST_STORE_KEYS.youtube, JSON.stringify(legacyEnvelope));

        const persistStorage = createMigratingPersistStorage();
        const raw = await Promise.resolve(persistStorage.getItem(PERSIST_STORE_KEYS.youtube));
        expect(raw).not.toBeNull();

        const parsed = JSON.parse(raw as string) as {
            state: { room: Record<string, unknown> };
            version: number;
        };
        expect(parsed.version).toBe(2);
        // Hot fields stripped on migrate — cold rejoin stub defaults.
        expect(parsed.state.room.currentTime).toBe(0);
        expect(parsed.state.room.isPlaying).toBe(false);
        expect(parsed.state.room.videoQueue).toEqual([]);
        expect(parsed.state.room.playingNow).toBeNull();
        expect(parsed.state.room.captionsLanguage).toBe(DEFAULT_CAPTION_LANGUAGE);
    });

    it('removes corrupt entries instead of throwing', () => {
        storage.setItem(PERSIST_STORE_KEYS.youtube, '{not json');
        const persistStorage = createMigratingPersistStorage();
        expect(persistStorage.getItem(PERSIST_STORE_KEYS.youtube)).toBeNull();
        expect(storage.getItem(PERSIST_STORE_KEYS.youtube)).toBeNull();
    });

    it('copies legacy key aliases once', () => {
        storage.setItem('youtubeStore', '{"state":{},"version":0}');
        runLegacyLocalStorageKeyMigration();
        expect(storage.getItem(PERSIST_STORE_KEYS.youtube)).toBe('{"state":{},"version":0}');
        expect(storage.getItem('youtubeStore')).toBeNull();
    });
});

function createMapStorage(): Storage {
    const map = new Map<string, string>();
    return {
        get length() {
            return map.size;
        },
        clear() {
            map.clear();
        },
        getItem(key: string) {
            return map.get(key) ?? null;
        },
        key(index: number) {
            return [...map.keys()][index] ?? null;
        },
        removeItem(key: string) {
            map.delete(key);
        },
        setItem(key: string, value: string) {
            map.set(key, value);
        },
    } as Storage;
}
