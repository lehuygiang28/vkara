import type Redis from 'ioredis';

import { isOnceToken } from '@vkara/url-commands';
import { ErrorCode, RoomError, isValidRoomId } from '@vkara/room';

import { assignHostOnJoin } from '@/modules/room/assign-host';
import { addVideoToRoom, nextVideoInRoom, playVideoNowInRoom } from '@/modules/room/room-commands';
import { upsertHttpAgentParticipant } from '@/modules/room/upsert-http-agent';
import { consumeJoinToken, JOIN_TOKEN_TTL_SECONDS, joinTokenKey } from '@/modules/url-commands/join-token';
import {
    createAgentSession,
    deleteAgentSession,
    generateAgentDeviceId,
    loadAgentSession,
    touchAgentSession,
    type AgentSessionRecord,
} from '@/modules/url-commands/agent-session';
import { consumeHttpOnce } from '@/modules/url-commands/http-once';
import {
    assertMutationBudget,
    assertSessionCreateBudget,
    assertYoutubeCircuitClosed,
    RateLimitedError,
} from '@/modules/url-commands/http-guardrails';
import { cleanRoomForAgentHttp } from '@/modules/url-commands/http-snapshot';
import { hydrateVideoById, type VideoSearchFn } from '@/modules/url-commands/hydrate-video';
import { RoomUnavailableError } from '@/modules/url-commands/room-unavailable';
import { canJoinWhenLocked } from '@/modules/room/participant-policy';
import { loadRoom, mutateRoom, requireRoom } from '@/utils/room-store';
import { createContextLogger } from '@/utils/logger';

const logger = createContextLogger('HttpRoomControl');

export type McpBind = { roomId: string; displayName: string };

export function echoBind(bind: McpBind): McpBind {
    return { roomId: bind.roomId, displayName: bind.displayName };
}

function assertBindMatchesSession(bind: McpBind, session: AgentSessionRecord): void {
    if (bind.roomId !== session.roomId) {
        throw new RoomUnavailableError();
    }
}

async function requireSession(redis: Redis, sessionToken: string): Promise<AgentSessionRecord> {
    const session = await loadAgentSession(redis, sessionToken);
    if (!session) {
        throw new RoomUnavailableError();
    }
    await touchAgentSession(redis, sessionToken);
    return session;
}

async function restoreJoinToken(redis: Redis, token: string, roomId: string): Promise<void> {
    await redis.set(
        joinTokenKey(token),
        JSON.stringify({ roomId }),
        'EX',
        JOIN_TOKEN_TTL_SECONDS,
    );
}

export async function createHttpAgentSession(
    redis: Redis,
    input: {
        bind: McpBind;
        password?: string;
        joinToken?: string;
        ip: string;
    },
) {
    await assertSessionCreateBudget(redis, input.ip);

    if (!isValidRoomId(input.bind.roomId)) {
        throw new RoomUnavailableError();
    }

    const joinToken = input.joinToken?.trim();
    const password = input.password?.trim();
    if (!joinToken && !password) {
        throw new RoomUnavailableError();
    }

    const room = await loadRoom(input.bind.roomId);
    if (!room) {
        throw new RoomUnavailableError();
    }

    let consumedJoinToken: string | undefined;
    if (joinToken) {
        const ok = await consumeJoinToken(redis, joinToken, input.bind.roomId);
        if (!ok) {
            throw new RoomUnavailableError();
        }
        consumedJoinToken = joinToken;
    } else {
        const expected = room.password?.trim();
        if (!expected || expected !== password) {
            throw new RoomUnavailableError();
        }
    }

    const deviceId = generateAgentDeviceId();
    if (!canJoinWhenLocked(room, deviceId)) {
        if (consumedJoinToken) {
            await restoreJoinToken(redis, consumedJoinToken, input.bind.roomId);
        }
        throw new RoomUnavailableError();
    }

    try {
        const { sessionToken, exp } = await createAgentSession(redis, {
            roomId: input.bind.roomId,
            deviceId,
            displayName: input.bind.displayName,
            ip: input.ip,
        });

        const nextRoom = await mutateRoom(input.bind.roomId, (current) => {
            upsertHttpAgentParticipant(current, deviceId, input.bind.displayName);
            const participant = current.participants[deviceId];
            if (participant) {
                assignHostOnJoin(current, participant, { isTvClient: false, isAgent: true });
            }
        });

        logger.info('HTTP agent session created', {
            roomId: input.bind.roomId,
            displayName: input.bind.displayName,
        });

        return {
            sessionToken,
            exp,
            bind: echoBind(input.bind),
            room: cleanRoomForAgentHttp(nextRoom),
        };
    } catch (error) {
        if (consumedJoinToken) {
            await restoreJoinToken(redis, consumedJoinToken, input.bind.roomId);
        }
        if (error instanceof RoomUnavailableError || error instanceof RateLimitedError) {
            throw error;
        }
        if (error instanceof Error && error.name === 'SessionCapError') {
            throw new RateLimitedError();
        }
        throw error;
    }
}

export async function getHttpAgentSession(redis: Redis, sessionToken: string) {
    const session = await requireSession(redis, sessionToken);
    const room = await requireRoom(session.roomId);
    return {
        bind: echoBind({ roomId: session.roomId, displayName: session.displayName }),
        room: cleanRoomForAgentHttp(room),
    };
}

export async function leaveHttpAgentSession(
    redis: Redis,
    input: { bind: McpBind; sessionToken: string },
) {
    const session = await requireSession(redis, input.sessionToken);
    assertBindMatchesSession(input.bind, session);

    await mutateRoom(session.roomId, (room) => {
        delete room.participants[session.deviceId];
    });
    await deleteAgentSession(redis, input.sessionToken, session);

    logger.info('HTTP agent left', { roomId: session.roomId, displayName: session.displayName });
    return { bind: echoBind({ roomId: session.roomId, displayName: session.displayName }) };
}

function assertOncePresent(once: string | undefined): string {
    const token = once?.trim() ?? '';
    if (!isOnceToken(token)) {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'once required');
    }
    return token;
}

function assertExp(exp?: number): void {
    if (typeof exp === 'number' && exp < Math.floor(Date.now() / 1000)) {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'expired');
    }
}

export class OnceReplayError extends Error {
    readonly status = 409;

    constructor() {
        super('once replay');
        this.name = 'OnceReplayError';
    }
}

export class VideoUnresolvedError extends Error {
    readonly status = 404;

    constructor() {
        super('video unresolved');
        this.name = 'VideoUnresolvedError';
    }
}

async function authorizeMutation(
    redis: Redis,
    input: { bind: McpBind; sessionToken: string; once?: string; exp?: number; ip: string },
): Promise<{ session: AgentSessionRecord; once: string }> {
    const session = await requireSession(redis, input.sessionToken);
    assertBindMatchesSession(input.bind, session);
    assertExp(input.exp);
    const once = assertOncePresent(input.once);
    await assertMutationBudget(redis, input.sessionToken, input.ip);
    const consumed = await consumeHttpOnce(redis, session.roomId, once);
    if (!consumed) {
        throw new OnceReplayError();
    }
    return { session, once };
}

async function refreshAgentPresence(session: AgentSessionRecord): Promise<void> {
    await mutateRoom(session.roomId, (room) => {
        upsertHttpAgentParticipant(room, session.deviceId, session.displayName);
        const participant = room.participants[session.deviceId];
        if (participant) {
            assignHostOnJoin(room, participant, { isTvClient: false, isAgent: true });
        }
    });
}

export async function httpQueue(
    redis: Redis,
    input: {
        bind: McpBind;
        sessionToken: string;
        videoId: string;
        once?: string;
        exp?: number;
        ip: string;
        search: VideoSearchFn;
    },
) {
    const { session } = await authorizeMutation(redis, input);
    await assertYoutubeCircuitClosed(redis);
    const video = await hydrateVideoById(redis, input.videoId, input.search);
    if (!video) {
        throw new VideoUnresolvedError();
    }
    const room = await addVideoToRoom(session.roomId, video);
    await refreshAgentPresence(session);
    return { bind: echoBind(input.bind), room: cleanRoomForAgentHttp(room) };
}

export async function httpPlay(
    redis: Redis,
    input: {
        bind: McpBind;
        sessionToken: string;
        videoId: string;
        once?: string;
        exp?: number;
        ip: string;
        search: VideoSearchFn;
    },
) {
    const { session } = await authorizeMutation(redis, input);
    await assertYoutubeCircuitClosed(redis);
    const video = await hydrateVideoById(redis, input.videoId, input.search);
    if (!video) {
        throw new VideoUnresolvedError();
    }
    const room = await playVideoNowInRoom(session.roomId, video);
    await refreshAgentPresence(session);
    return { bind: echoBind(input.bind), room: cleanRoomForAgentHttp(room) };
}

export async function httpNext(
    redis: Redis,
    input: { bind: McpBind; sessionToken: string; once?: string; exp?: number; ip: string },
) {
    const { session } = await authorizeMutation(redis, input);
    const room = await nextVideoInRoom(session.roomId);
    await refreshAgentPresence(session);
    return {
        bind: echoBind(input.bind),
        room: room ? cleanRoomForAgentHttp(room) : null,
    };
}
