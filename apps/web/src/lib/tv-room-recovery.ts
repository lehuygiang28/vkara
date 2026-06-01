import {
    ErrorCode,
    type ClientMessage,
    type Room,
    type TvRoomRestoreState,
} from '@vkara/shared-types';
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
    if (!room?.id) return null;

    return {
        previousRoomId: room.id,
        password: room.password,
        restore: {
            videoQueue: [...room.videoQueue],
            playingNow: room.playingNow,
            isPlaying: room.isPlaying,
            currentTime: room.currentTime,
            volume: room.volume,
            showQRInPlayer: room.showQRInPlayer,
            captionsEnabled: room.captionsEnabled,
            captionsLanguage: room.captionsLanguage,
            captionTracks: [...room.captionTracks],
            captionTracksVideoId: room.captionTracksVideoId,
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
