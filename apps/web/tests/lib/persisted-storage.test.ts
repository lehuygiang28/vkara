import { DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import { normalizePersistedRoom } from '@vkara/room';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createMigratingPersistStorage,
    normalizePersistedYouTubeVideo,
    PERSIST_STORE_KEYS,
    readClientPersistItem,
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
    const setItem = storage.setItem.bind(storage);
    const removeItem = storage.removeItem.bind(storage);

    beforeEach(() => {
        storage.clear();
        storage.setItem = setItem;
        storage.removeItem = removeItem;
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

    it('keeps a corrupt blob aside and does not throw', () => {
        storage.setItem(PERSIST_STORE_KEYS.youtube, '{not json');
        const persistStorage = createMigratingPersistStorage();
        expect(persistStorage.getItem(PERSIST_STORE_KEYS.youtube)).toBeNull();
        expect(storage.getItem(PERSIST_STORE_KEYS.youtube)).toBeNull();
        expect(storage.getItem(`${PERSIST_STORE_KEYS.youtube}.bad`)).toBe('{not json');
    });

    it('restores the previous good write when the primary blob does not parse', () => {
        const persistStorage = createMigratingPersistStorage();
        const good = JSON.stringify({ state: { layoutMode: 'remote' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.youtube, good);
        storage.setItem(PERSIST_STORE_KEYS.youtube, '{not json');

        const raw = persistStorage.getItem(PERSIST_STORE_KEYS.youtube);
        expect(raw).not.toBeNull();
        expect(JSON.parse(raw as string).state.layoutMode).toBe('remote');
        expect(JSON.parse(storage.getItem(PERSIST_STORE_KEYS.youtube) as string).state.layoutMode).toBe(
            'remote',
        );
        expect(storage.getItem(`${PERSIST_STORE_KEYS.youtube}.bad`)).toBe('{not json');
    });

    it('refuses to replace a good blob with json that does not parse', () => {
        const persistStorage = createMigratingPersistStorage();
        const good = JSON.stringify({ state: { layoutMode: 'remote' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.youtube, good);
        persistStorage.setItem(PERSIST_STORE_KEYS.youtube, '{not json');
        expect(storage.getItem(PERSIST_STORE_KEYS.youtube)).toBe(good);
    });

    it('leaves the previous blob in place when the write throws', () => {
        const persistStorage = createMigratingPersistStorage();
        const good = JSON.stringify({ state: { layoutMode: 'remote' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.youtube, good);
        const setItem = storage.setItem.bind(storage);
        storage.setItem = (key: string, value: string) => {
            if (key === PERSIST_STORE_KEYS.youtube && value.includes('player')) {
                throw new Error('quota');
            }
            setItem(key, value);
        };

        persistStorage.setItem(
            PERSIST_STORE_KEYS.youtube,
            JSON.stringify({ state: { layoutMode: 'player' }, version: 1 }),
        );

        expect(storage.getItem(PERSIST_STORE_KEYS.youtube)).toBe(good);
    });

    it('copies legacy key aliases once', () => {
        storage.setItem('youtubeStore', '{"state":{},"version":0}');
        runLegacyLocalStorageKeyMigration();
        expect(storage.getItem(PERSIST_STORE_KEYS.youtube)).toBe('{"state":{},"version":0}');
        expect(storage.getItem('youtubeStore')).toBeNull();
    });

    it('leaves a legacy key in place when the current key already has a value', () => {
        storage.setItem(PERSIST_STORE_KEYS.youtube, '{"state":{"layoutMode":"player"},"version":2}');
        storage.setItem('youtubeStore', '{"state":{},"version":0}');
        runLegacyLocalStorageKeyMigration();
        expect(storage.getItem(PERSIST_STORE_KEYS.youtube)).toBe(
            '{"state":{"layoutMode":"player"},"version":2}',
        );
        expect(storage.getItem('youtubeStore')).toBe('{"state":{},"version":0}');
    });

    it('restores a missing primary key from the backup', () => {
        const persistStorage = createMigratingPersistStorage();
        const good = JSON.stringify({ state: { query: 'hello' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.search, good);
        storage.removeItem(PERSIST_STORE_KEYS.search);

        const raw = persistStorage.getItem(PERSIST_STORE_KEYS.search);
        expect(raw).toBe(good);
        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBe(good);
    });

    it('returns null when the backup does not parse either', () => {
        storage.setItem(`${PERSIST_STORE_KEYS.search}.bak`, '{also bad');
        const persistStorage = createMigratingPersistStorage();
        expect(persistStorage.getItem(PERSIST_STORE_KEYS.search)).toBeNull();
        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBeNull();
    });

    it('keeps the first quarantined copy when the primary key breaks again', () => {
        storage.setItem(`${PERSIST_STORE_KEYS.search}.bad`, 'first');
        storage.setItem(PERSIST_STORE_KEYS.search, '{second');
        const persistStorage = createMigratingPersistStorage();
        expect(persistStorage.getItem(PERSIST_STORE_KEYS.search)).toBeNull();
        expect(storage.getItem(`${PERSIST_STORE_KEYS.search}.bad`)).toBe('first');
    });

    it('quarantines a json array and a json null without throwing', () => {
        const persistStorage = createMigratingPersistStorage();
        storage.setItem(PERSIST_STORE_KEYS.search, '[1,2]');
        expect(persistStorage.getItem(PERSIST_STORE_KEYS.search)).toBeNull();
        expect(storage.getItem(`${PERSIST_STORE_KEYS.search}.bad`)).toBe('[1,2]');

        storage.setItem(PERSIST_STORE_KEYS.appSettings, 'null');
        expect(persistStorage.getItem(PERSIST_STORE_KEYS.appSettings)).toBeNull();
        expect(storage.getItem(`${PERSIST_STORE_KEYS.appSettings}.bad`)).toBe('null');
    });

    it('keeps the corrupt primary key when removing it throws', () => {
        storage.setItem(PERSIST_STORE_KEYS.search, '{not json');
        const removeItem = storage.removeItem.bind(storage);
        storage.removeItem = (key: string) => {
            if (key === PERSIST_STORE_KEYS.search) {
                throw new Error('locked');
            }
            removeItem(key);
        };

        expect(createMigratingPersistStorage().getItem(PERSIST_STORE_KEYS.search)).toBeNull();
        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBe('{not json');
        expect(storage.getItem(`${PERSIST_STORE_KEYS.search}.bad`)).toBe('{not json');
    });

    it('still returns the backup when copying it back onto the primary key throws', () => {
        const good = JSON.stringify({ state: { query: 'kept' }, version: 1 });
        storage.setItem(`${PERSIST_STORE_KEYS.search}.bak`, good);
        const setItem = storage.setItem.bind(storage);
        storage.setItem = (key: string, value: string) => {
            if (key === PERSIST_STORE_KEYS.search) {
                throw new Error('quota');
            }
            setItem(key, value);
        };

        const raw = createMigratingPersistStorage().getItem(PERSIST_STORE_KEYS.search);
        expect(raw).toBe(good);
        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBeNull();
    });

    it('does not copy a corrupt primary blob over the backup before a new write', () => {
        const persistStorage = createMigratingPersistStorage();
        const previous = JSON.stringify({ state: { query: 'old' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.search, previous);
        storage.setItem(PERSIST_STORE_KEYS.search, '{not json');
        const next = JSON.stringify({ state: { query: 'new' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.search, next);

        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBe(next);
        expect(storage.getItem(`${PERSIST_STORE_KEYS.search}.bak`)).toBe(next);
    });

    it('skips a second backup write when the backup already matches', () => {
        const persistStorage = createMigratingPersistStorage();
        const good = JSON.stringify({ state: { query: 'same' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.search, good);
        let backupWrites = 0;
        const setItem = storage.setItem.bind(storage);
        storage.setItem = (key: string, value: string) => {
            if (key === `${PERSIST_STORE_KEYS.search}.bak`) {
                backupWrites += 1;
            }
            setItem(key, value);
        };

        persistStorage.setItem(PERSIST_STORE_KEYS.search, good);
        persistStorage.getItem(PERSIST_STORE_KEYS.search);
        expect(backupWrites).toBe(0);
        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBe(good);
    });

    it('keeps the new primary value when the backup slot is full', () => {
        const persistStorage = createMigratingPersistStorage();
        const setItem = storage.setItem.bind(storage);
        storage.setItem = (key: string, value: string) => {
            if (key.endsWith('.bak')) {
                throw new Error('quota');
            }
            setItem(key, value);
        };
        const good = JSON.stringify({ state: { query: 'primary' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.search, good);
        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBe(good);
        expect(storage.getItem(`${PERSIST_STORE_KEYS.search}.bak`)).toBeNull();
    });

    it('removes the primary key and its backup together', () => {
        const persistStorage = createMigratingPersistStorage();
        const good = JSON.stringify({ state: { query: 'gone' }, version: 1 });
        persistStorage.setItem(PERSIST_STORE_KEYS.search, good);
        persistStorage.removeItem(PERSIST_STORE_KEYS.search);
        expect(storage.getItem(PERSIST_STORE_KEYS.search)).toBeNull();
        expect(storage.getItem(`${PERSIST_STORE_KEYS.search}.bak`)).toBeNull();
    });

    it('does not throw when storage is missing', () => {
        vi.stubGlobal('localStorage', undefined);
        const persistStorage = createMigratingPersistStorage();
        expect(readClientPersistItem(PERSIST_STORE_KEYS.search)).toBeNull();
        expect(() => runLegacyLocalStorageKeyMigration()).not.toThrow();
        expect(() =>
            persistStorage.setItem(
                PERSIST_STORE_KEYS.search,
                JSON.stringify({ state: {}, version: 1 }),
            ),
        ).not.toThrow();
        expect(() => persistStorage.removeItem(PERSIST_STORE_KEYS.search)).not.toThrow();
    });

    it('migrates a personalization blob and drops rows that are not videos', () => {
        storage.setItem(
            PERSIST_STORE_KEYS.personalization,
            JSON.stringify({
                state: {
                    searchHistory: [{ query: 'son tung' }, { query: 1 }, null, 'x'],
                    channelScores: ['nope'],
                    recentVideos: [{ id: 'abc' }, { id: '' }, null, { title: 'missing' }],
                },
            }),
        );

        const raw = createMigratingPersistStorage().getItem(PERSIST_STORE_KEYS.personalization);
        const parsed = JSON.parse(raw as string) as {
            state: {
                searchHistory: { query: string }[];
                channelScores: Record<string, number>;
                recentVideos: { id: string; title: string; isLive?: boolean }[];
            };
            version: number;
        };

        expect(parsed.version).toBe(1);
        expect(parsed.state.searchHistory).toEqual([{ query: 'son tung' }]);
        expect(parsed.state.channelScores).toEqual({});
        expect(parsed.state.recentVideos.map((video) => video.id)).toEqual(['abc']);
        expect(parsed.state.recentVideos[0]?.title).toBe('abc');
    });

    it('keeps valid personalization scores and ignores a non-object state', () => {
        const persistStorage = createMigratingPersistStorage();
        storage.setItem(
            PERSIST_STORE_KEYS.personalization,
            JSON.stringify({
                state: {
                    searchHistory: 'nope',
                    channelScores: { 'UC-1': 4 },
                    recentVideos: { id: 'abc' },
                },
                version: 3,
            }),
        );
        const scores = JSON.parse(
            persistStorage.getItem(PERSIST_STORE_KEYS.personalization) as string,
        ).state;
        expect(scores.channelScores).toEqual({ 'UC-1': 4 });
        expect(scores.searchHistory).toEqual([]);
        expect(scores.recentVideos).toEqual([]);

        storage.setItem(
            PERSIST_STORE_KEYS.personalization,
            JSON.stringify({ state: null, version: 4 }),
        );
        expect(JSON.parse(persistStorage.getItem(PERSIST_STORE_KEYS.personalization) as string)).toMatchObject(
            { state: null, version: 4 },
        );
    });

    it('leaves a current non-youtube blob untouched when its version is already current', () => {
        const good = JSON.stringify({ state: { query: 'stable' }, version: 1 });
        storage.setItem(PERSIST_STORE_KEYS.search, good);
        expect(createMigratingPersistStorage().getItem(PERSIST_STORE_KEYS.search)).toBe(good);
    });
});

describe('normalizePersistedYouTubeVideo', () => {
    it('returns null for an empty value or a video without an id', () => {
        expect(normalizePersistedYouTubeVideo(null)).toBeNull();
        expect(normalizePersistedYouTubeVideo('abc')).toBeNull();
        expect(normalizePersistedYouTubeVideo({ id: '' })).toBeNull();
        expect(normalizePersistedYouTubeVideo({ title: 'no id' })).toBeNull();
    });

    it('fills defaults and keeps live, source, and photo count when they are valid', () => {
        const video = normalizePersistedYouTubeVideo({
            id: 'abc',
            isLive: false,
            source: 'youtube',
            tiktokImageCount: 3,
            thumbnails: 'nope',
        });

        expect(video).toMatchObject({
            id: 'abc',
            title: 'abc',
            duration: 0,
            duration_formatted: '0:00',
            type: 'video',
            uploadedAt: '',
            url: 'https://www.youtube.com/watch?v=abc',
            views: 0,
            thumbnails: [],
            isLive: false,
            source: 'youtube',
            tiktokImageCount: 3,
        });
    });

    it('drops a source and a photo count that are not usable', () => {
        const video = normalizePersistedYouTubeVideo({
            id: 'abc',
            title: 'Title',
            duration: 12,
            duration_formatted: '0:12',
            type: 'short',
            uploadedAt: 'today',
            url: 'https://youtu.be/abc',
            views: 9,
            thumbnails: [{ url: 'https://i.ytimg.com/a.jpg' }],
            source: 'vimeo',
            tiktokImageCount: 1.5,
        });

        expect(video?.source).toBeUndefined();
        expect(video?.tiktokImageCount).toBeUndefined();
        expect(video?.isLive).toBeUndefined();
        expect(video?.title).toBe('Title');
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
