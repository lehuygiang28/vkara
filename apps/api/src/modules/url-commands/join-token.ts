import type Redis from 'ioredis';

import { generateOnceToken, isOnceToken } from '@vkara/url-commands';
import { isValidRoomId } from '@vkara/room';

export const JOIN_TOKEN_KEY_PREFIX = 'join-token:';
export const JOIN_TOKEN_TTL_SECONDS = 600;

type JoinTokenRecord = {
    roomId: string;
};

export function joinTokenKey(token: string): string {
    return `${JOIN_TOKEN_KEY_PREFIX}${token}`;
}

export async function mintJoinToken(
    redis: Redis,
    roomId: string,
): Promise<{ joinToken: string; roomId: string; exp: number }> {
    if (!isValidRoomId(roomId)) {
        throw new Error('mintJoinToken: invalid roomId');
    }
    const joinToken = generateOnceToken();
    const exp = Math.floor(Date.now() / 1000) + JOIN_TOKEN_TTL_SECONDS;
    const record: JoinTokenRecord = { roomId };
    await redis.set(joinTokenKey(joinToken), JSON.stringify(record), 'EX', JOIN_TOKEN_TTL_SECONDS);
    return { joinToken, roomId, exp };
}

export async function consumeJoinToken(
    redis: Redis,
    token: string,
    roomId: string,
): Promise<boolean> {
    if (!isOnceToken(token) || !isValidRoomId(roomId)) {
        return false;
    }
    const key = joinTokenKey(token);
    const raw = await redis.getdel(key);
    if (!raw) {
        return false;
    }
    try {
        const record = JSON.parse(raw) as JoinTokenRecord;
        if (record.roomId !== roomId) {
            await redis.set(key, raw, 'EX', JOIN_TOKEN_TTL_SECONDS);
            return false;
        }
    } catch {
        return false;
    }
    return true;
}
