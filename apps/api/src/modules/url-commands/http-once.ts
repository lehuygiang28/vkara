import type Redis from 'ioredis';

import { isOnceToken } from '@vkara/url-commands';
import { isValidRoomId } from '@vkara/room';

export const HTTP_ONCE_TTL_SECONDS = 600;

export function httpOnceKey(roomId: string, token: string): string {
    return `once:http:${roomId}:${token}`;
}

/** @returns true if this call consumed the token; false if replay or invalid. */
export async function consumeHttpOnce(
    redis: Redis,
    roomId: string,
    token: string,
): Promise<boolean> {
    if (!isOnceToken(token) || !isValidRoomId(roomId)) {
        return false;
    }
    const result = await redis.set(httpOnceKey(roomId, token), roomId, 'EX', HTTP_ONCE_TTL_SECONDS, 'NX');
    return result === 'OK';
}

export async function httpOnceExists(redis: Redis, roomId: string, token: string): Promise<boolean> {
    return (await redis.exists(httpOnceKey(roomId, token))) === 1;
}
