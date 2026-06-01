import { isValidRoomId } from '@vkara/shared-utils';
import { ErrorCode, normalizePersistedRoom, RoomError, type Room } from '@vkara/shared-types';

function normalizeRoomCaptionFields(room: Room): void {
    const normalized = normalizePersistedRoom(room);
    if (!normalized) {
        return;
    }
    Object.assign(room, normalized);
}

import { redis } from '@/redis';

const ROOM_KEY_PREFIX = 'room:';
const MUTATION_MAX_RETRIES = 12;

/** Scan Redis keys without blocking the server (unlike KEYS). */
export async function scanRedisKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
        const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        keys.push(...batch);
    } while (cursor !== '0');

    return keys;
}

function roomKey(roomId: string): string {
    return `${ROOM_KEY_PREFIX}${roomId}`;
}

export async function loadRoom(roomId: string): Promise<Room | null> {
    const roomData = await redis.get(roomKey(roomId));
    if (!roomData) return null;

    try {
        const room = JSON.parse(roomData) as Room;
        normalizeRoomCaptionFields(room);
        return room;
    } catch {
        throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Failed to parse room data');
    }
}

export async function requireRoom(roomId: string, isRejoin = false): Promise<Room> {
    if (!isValidRoomId(roomId)) {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Room ID must be a valid 4-digit code');
    }

    const room = await loadRoom(roomId);
    if (!room) {
        throw new RoomError(isRejoin ? ErrorCode.REJOIN_ROOM_NOT_FOUND : ErrorCode.ROOM_NOT_FOUND);
    }

    return room;
}

export async function writeRoom(roomId: string, room: Room): Promise<void> {
    room.lastActivity = Date.now();
    await redis.set(roomKey(roomId), JSON.stringify(room));
}

/**
 * Optimistic read-modify-write via Redis WATCH/MULTI.
 * Safe across concurrent WebSocket handlers and API instances.
 * The mutator must stay synchronous — run async I/O (e.g. embeddable checks) before calling this.
 */
export async function mutateRoom(
    roomId: string,
    mutator: (room: Room) => void,
    options?: { isRejoin?: boolean },
): Promise<Room> {
    const key = roomKey(roomId);

    if (!isValidRoomId(roomId)) {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Room ID must be a valid 4-digit code');
    }

    for (let attempt = 0; attempt < MUTATION_MAX_RETRIES; attempt++) {
        await redis.watch(key);

        try {
            const roomData = await redis.get(key);
            if (!roomData) {
                await redis.unwatch();
                throw new RoomError(
                    options?.isRejoin ? ErrorCode.REJOIN_ROOM_NOT_FOUND : ErrorCode.ROOM_NOT_FOUND,
                );
            }

            let room: Room;
            try {
                room = JSON.parse(roomData) as Room;
            } catch {
                await redis.unwatch();
                throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Failed to parse room data');
            }

            normalizeRoomCaptionFields(room);
            mutator(room);
            normalizeRoomCaptionFields(room);
            room.lastActivity = Date.now();

            const execResult = await redis.multi().set(key, JSON.stringify(room)).exec();
            if (execResult !== null) {
                return room;
            }
        } catch (error) {
            await redis.unwatch().catch(() => undefined);
            throw error;
        }
    }

    throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Room update conflict, please retry');
}

export function isVideoAlreadyInRoom(room: Room, videoId: string): boolean {
    return room.videoQueue.some((video) => video.id === videoId) || room.playingNow?.id === videoId;
}
