import type Redis from 'ioredis';

import { generateOnceToken } from '@vkara/url-commands';
import { isValidRoomId } from '@vkara/room';

export const AGENT_SESSION_KEY_PREFIX = 'agent-session:';
export const AGENT_SESSION_IDLE_TTL_SECONDS = 30 * 60;
export const AGENT_SESSION_ABSOLUTE_TTL_MS = 60 * 60 * 1000;
export const MAX_SESSIONS_PER_ROOM = 8;
export const MAX_SESSIONS_PER_IP = 4;

export type AgentSessionRecord = {
    roomId: string;
    deviceId: string;
    displayName: string;
    createdAt: number;
    ip?: string;
};

export function agentSessionKey(token: string): string {
    return `${AGENT_SESSION_KEY_PREFIX}${token}`;
}

function roomIndexKey(roomId: string): string {
    return `agent-sessions:room:${roomId}`;
}

function ipIndexKey(ip: string): string {
    return `agent-sessions:ip:${ip}`;
}

export function generateAgentDeviceId(): string {
    return `agent-${generateOnceToken()}`;
}

export async function createAgentSession(
    redis: Redis,
    record: Omit<AgentSessionRecord, 'createdAt'> & { createdAt?: number },
): Promise<{ sessionToken: string; exp: number; record: AgentSessionRecord }> {
    if (!isValidRoomId(record.roomId)) {
        throw new Error('createAgentSession: invalid roomId');
    }

    const roomCount = await redis.scard(roomIndexKey(record.roomId));
    if (roomCount >= MAX_SESSIONS_PER_ROOM) {
        const error = new Error('session cap');
        error.name = 'SessionCapError';
        throw error;
    }
    if (record.ip) {
        const ipCount = await redis.scard(ipIndexKey(record.ip));
        if (ipCount >= MAX_SESSIONS_PER_IP) {
            const error = new Error('session cap');
            error.name = 'SessionCapError';
            throw error;
        }
    }

    const sessionToken = generateOnceToken();
    const createdAt = record.createdAt ?? Date.now();
    const stored: AgentSessionRecord = {
        roomId: record.roomId,
        deviceId: record.deviceId,
        displayName: record.displayName,
        createdAt,
        ip: record.ip,
    };
    const exp = Math.floor(Date.now() / 1000) + AGENT_SESSION_IDLE_TTL_SECONDS;
    await redis.set(
        agentSessionKey(sessionToken),
        JSON.stringify(stored),
        'EX',
        AGENT_SESSION_IDLE_TTL_SECONDS,
    );
    await redis.sadd(roomIndexKey(record.roomId), sessionToken);
    await redis.expire(roomIndexKey(record.roomId), AGENT_SESSION_IDLE_TTL_SECONDS);
    if (record.ip) {
        await redis.sadd(ipIndexKey(record.ip), sessionToken);
        await redis.expire(ipIndexKey(record.ip), AGENT_SESSION_IDLE_TTL_SECONDS);
    }
    return { sessionToken, exp, record: stored };
}

export async function loadAgentSession(
    redis: Redis,
    token: string,
): Promise<AgentSessionRecord | null> {
    const raw = await redis.get(agentSessionKey(token));
    if (!raw) {
        return null;
    }
    try {
        const record = JSON.parse(raw) as AgentSessionRecord;
        if (Date.now() - record.createdAt > AGENT_SESSION_ABSOLUTE_TTL_MS) {
            await deleteAgentSession(redis, token, record);
            return null;
        }
        return record;
    } catch {
        return null;
    }
}

export async function touchAgentSession(redis: Redis, token: string): Promise<boolean> {
    const record = await loadAgentSession(redis, token);
    if (!record) {
        return false;
    }
    await redis.expire(agentSessionKey(token), AGENT_SESSION_IDLE_TTL_SECONDS);
    await redis.expire(roomIndexKey(record.roomId), AGENT_SESSION_IDLE_TTL_SECONDS);
    if (record.ip) {
        await redis.expire(ipIndexKey(record.ip), AGENT_SESSION_IDLE_TTL_SECONDS);
    }
    return true;
}

export async function deleteAgentSession(
    redis: Redis,
    token: string,
    record?: AgentSessionRecord,
): Promise<void> {
    const existing = record ?? (await loadAgentSession(redis, token));
    await redis.del(agentSessionKey(token));
    if (existing) {
        await redis.srem(roomIndexKey(existing.roomId), token);
        if (existing.ip) {
            await redis.srem(ipIndexKey(existing.ip), token);
        }
    }
}
