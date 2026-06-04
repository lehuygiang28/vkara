import { ErrorCode, normalizePersistedRoom, type Room } from '@vkara/room';
import type { ClientMessage, TvRoomRestoreState } from '@vkara/validators/ws/client-message';
import type { WebSocketState } from '@/types/websocket.type';

export type TvRoomSnapshot = {
    previousRoomId: string;
    password?: string;
    restore: TvRoomRestoreState;
};

export function isTvLayoutMode(effectiveLayoutMode: string): boolean {
    return effectiveLayoutMode !== 'remote';
}

export function shouldRecoverTvRoom(
    messageType: string,
    code: ErrorCode | undefined,
    isTvLayout: boolean,
): boolean {
    if (!isTvLayout) return false;
    if (messageType === 'roomClosed') return true;
    return messageType === 'errorWithCode' && code === ErrorCode.REJOIN_ROOM_NOT_FOUND;
}

export function captureTvRoomSnapshot(room: Omit<Room, 'clients'> | null): TvRoomSnapshot | null {
    const normalized = normalizePersistedRoom(room);
    if (!normalized) return null;

    return {
        previousRoomId: normalized.id,
        password: normalized.password,
        restore: {
            videoQueue: [...normalized.videoQueue],
            playingNow: normalized.playingNow,
            isPlaying: normalized.isPlaying,
            currentTime: normalized.currentTime,
            volume: normalized.volume,
            showQRInPlayer: normalized.showQRInPlayer,
            captionsEnabled: normalized.captionsEnabled,
            captionsLanguage: normalized.captionsLanguage,
            captionTracks: [...normalized.captionTracks],
            captionTracksVideoId: normalized.captionTracksVideoId,
        },
    };
}

export function buildTvRecoveryCreateRoomMessage(
    snapshot: TvRoomSnapshot,
): Omit<Extract<ClientMessage, { type: 'createRoom' }>, 'id' | 'timestamp' | 'requiresAck'> {
    return {
        type: 'createRoom',
        password: snapshot.password,
        preferredRoomId: snapshot.previousRoomId,
        restore: snapshot.restore,
    };
}

export function recoverTvRoom(
    ensureConnectedAndSend: WebSocketState['sendMessage'],
    snapshot: TvRoomSnapshot | null,
): boolean {
    if (!snapshot) {
        ensureConnectedAndSend({ type: 'createRoom' });
        return true;
    }

    ensureConnectedAndSend(buildTvRecoveryCreateRoomMessage(snapshot));
    return true;
}
