import { DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import type { Participant, Room } from './websocket';

/** Room snapshot persisted in the browser (no `clients`). */
export type PersistedRoom = Omit<Room, 'clients'>;

/** Display-safe participant view (no extra stripping needed — already safe). */
export type PersistedParticipant = Participant;

/**
 * Backfill missing fields on instances of older localStorage / Redis payloads so TV
 * recovery, caption, participants and lock UI never read `undefined` arrays or flags.
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
        volume: typeof room.volume === 'number' ? Math.min(100, Math.max(0, room.volume)) : 100,
        showQRInPlayer: room.showQRInPlayer ?? true,
        captionsEnabled: room.captionsEnabled ?? false,
        captionsLanguage: room.captionsLanguage || DEFAULT_CAPTION_LANGUAGE,
        captionTracks: Array.isArray(room.captionTracks) ? room.captionTracks : [],
        captionTracksVideoId: room.captionTracksVideoId ?? null,
        playingNow: room.playingNow ?? null,
        isPlaying: room.isPlaying ?? false,
        currentTime: typeof room.currentTime === 'number' ? room.currentTime : 0,
        tiktokPhotoIndex:
            typeof room.tiktokPhotoIndex === 'number'
                ? Math.max(0, Math.floor(room.tiktokPhotoIndex))
                : 0,
        tiktokPhotoMaxIndex:
            typeof room.tiktokPhotoMaxIndex === 'number'
                ? Math.max(0, Math.floor(room.tiktokPhotoMaxIndex))
                : 0,
        lastActivity: typeof room.lastActivity === 'number' ? room.lastActivity : Date.now(),
        creatorId: typeof room.creatorId === 'string' ? room.creatorId : '',
        locked: Boolean(room.locked),
        lockedAt: typeof room.lockedAt === 'number' ? room.lockedAt : undefined,
        lockedBy: typeof room.lockedBy === 'string' ? room.lockedBy : undefined,
        participants: normalizeParticipants(room.participants),
        hostDeviceId: typeof room.hostDeviceId === 'string' ? room.hostDeviceId : '',
        hasPassword: Boolean(room.hasPassword ?? room.password),
    };
}

function normalizeParticipants(
    raw: Partial<Record<string, Partial<Participant>>> | undefined,
): Record<string, Participant> {
    const out: Record<string, Participant> = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [key, value] of Object.entries(raw)) {
        if (!value || typeof value !== 'object' || typeof value.deviceId !== 'string') continue;
        out[key] = {
            deviceId: value.deviceId,
            displayName: typeof value.displayName === 'string' ? value.displayName : value.deviceId,
            role: value.role === 'host' ? 'host' : 'member',
            joinedAt: typeof value.joinedAt === 'number' ? value.joinedAt : Date.now(),
            lastSeen: typeof value.lastSeen === 'number' ? value.lastSeen : Date.now(),
            connectionIds: Array.isArray(value.connectionIds) ? value.connectionIds : [],
            isTvConnection: Boolean(value.isTvConnection),
            isAgent: Boolean(value.isAgent),
        };
    }
    return out;
}
