import type { Room } from '@vkara/shared-types';

import { redis } from '@/redis';

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

export function invalidateRoomCache(
    roomCache: Map<string, { room: Room; timestamp: number }>,
    roomId: string,
): void {
    roomCache.delete(roomId);
}

export async function loadRoom(roomId: string): Promise<Room | null> {
    const roomData = await redis.get(`room:${roomId}`);
    if (!roomData) return null;
    return JSON.parse(roomData) as Room;
}

export async function saveRoom(
    roomId: string,
    room: Room,
    roomCache: Map<string, { room: Room; timestamp: number }>,
): Promise<void> {
    room.lastActivity = Date.now();
    await redis.set(`room:${roomId}`, JSON.stringify(room));
    roomCache.set(roomId, { room, timestamp: Date.now() });
}
