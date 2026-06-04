import { DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import type { Room } from './websocket';

/** Room snapshot persisted in the browser (no `clients`). */
export type PersistedRoom = Omit<Room, 'clients'>;

/**
 * Backfill fields missing from older localStorage / Redis payloads so TV recovery
 * and caption UI never read `undefined` arrays or flags.
 */
export function normalizePersistedRoom(
    room: Partial<PersistedRoom> | null | undefined,
): PersistedRoom | null {
    if (!room || typeof room !== 'object' || typeof room.id !== 'string' || !room.id) {
        return null;
    }

    return {
        ...room,
        id: room.id,
        videoQueue: Array.isArray(room.videoQueue) ? room.videoQueue : [],
        historyQueue: Array.isArray(room.historyQueue) ? room.historyQueue : [],
        volume:
            typeof room.volume === 'number'
                ? Math.min(100, Math.max(0, room.volume))
                : 100,
        showQRInPlayer: room.showQRInPlayer ?? true,
        captionsEnabled: room.captionsEnabled ?? false,
        captionsLanguage: room.captionsLanguage || DEFAULT_CAPTION_LANGUAGE,
        captionTracks: Array.isArray(room.captionTracks) ? room.captionTracks : [],
        captionTracksVideoId: room.captionTracksVideoId ?? null,
        playingNow: room.playingNow ?? null,
        isPlaying: room.isPlaying ?? false,
        currentTime: typeof room.currentTime === 'number' ? room.currentTime : 0,
        lastActivity: typeof room.lastActivity === 'number' ? room.lastActivity : Date.now(),
        creatorId: typeof room.creatorId === 'string' ? room.creatorId : '',
    };
}
