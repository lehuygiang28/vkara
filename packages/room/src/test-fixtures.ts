import type { PersistedRoom } from './persisted-room';
import type { Room } from './websocket';

/** Full persisted room defaults for tests (`Omit<Room, 'clients'>`). */
export function createTestPersistedRoom(overrides: Partial<PersistedRoom> = {}): PersistedRoom {
    return {
        id: '1234',
        videoQueue: [],
        historyQueue: [],
        volume: 100,
        showQRInPlayer: true,
        captionsEnabled: false,
        captionsLanguage: 'vi',
        captionTracks: [],
        captionTracksVideoId: null,
        playingNow: null,
        lastActivity: 0,
        creatorId: 'c1',
        isPlaying: false,
        currentTime: 0,
        tiktokPhotoIndex: 0,
        tiktokPhotoMaxIndex: 0,
        ...overrides,
    };
}

/** Full server room defaults for tests (includes `clients`). */
export function createTestRoom(overrides: Partial<Room> = {}): Room {
    const { clients, ...persistedOverrides } = overrides;
    return {
        ...createTestPersistedRoom(persistedOverrides),
        clients: clients ?? [],
    };
}
