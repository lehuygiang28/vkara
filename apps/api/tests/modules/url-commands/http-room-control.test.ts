import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomError } from '@vkara/room';
import { createTestRoom } from '@vkara/room/test-fixtures';
import { generateOnceToken } from '@vkara/url-commands';

import { memoryRedis } from '../../helpers/memory-redis';

const { roomState, addVideoToRoom, playVideoNowInRoom, nextVideoInRoom, loggerInfo } = vi.hoisted(() => {
    const roomState = {
        current: {
            id: '4821',
            password: 'party',
            participants: {},
            clients: [],
        } as unknown as ReturnType<typeof createTestRoom>,
    };
    return {
        roomState,
        addVideoToRoom: vi.fn(async () => roomState.current),
        playVideoNowInRoom: vi.fn(async () => roomState.current),
        nextVideoInRoom: vi.fn(async () => roomState.current),
        loggerInfo: vi.fn(),
    };
});

vi.mock('@/utils/logger', () => ({
    createContextLogger: () => ({
        info: loggerInfo,
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

vi.mock('@/utils/room-store', () => ({
    loadRoom: vi.fn(async (roomId: string) => (roomState.current.id === roomId ? roomState.current : null)),
    requireRoom: vi.fn(async (roomId: string) => {
        if (roomState.current.id !== roomId) {
            throw new Error('missing');
        }
        return roomState.current;
    }),
    mutateRoom: vi.fn(async (_roomId: string, mutator: (room: typeof roomState.current) => void) => {
        mutator(roomState.current);
        return roomState.current;
    }),
}));

vi.mock('@/modules/room/room-commands', () => ({
    addVideoToRoom,
    playVideoNowInRoom,
    nextVideoInRoom,
}));

import { mintJoinToken } from '@/modules/url-commands/join-token';
import {
    createHttpAgentSession,
    getHttpAgentSession,
    httpQueue,
    leaveHttpAgentSession,
    OnceReplayError,
    VideoUnresolvedError,
} from '@/modules/url-commands/http-room-control';
import { RoomUnavailableError } from '@/modules/url-commands/room-unavailable';
import { RateLimitedError } from '@/modules/url-commands/http-guardrails';

const bind = { roomId: '4821', displayName: 'Claude' };
const video = {
    id: 'vid1',
    title: 'Song',
    duration: 1,
    duration_formatted: '0:01',
    type: 'video' as const,
    url: 'https://www.youtube.com/watch?v=vid1',
    uploadedAt: '',
    views: 0,
    channels: [{ name: 'A', verified: false }],
    thumbnails: [{ url: 'https://example.com/t.jpg', width: 120, height: 90 }],
};

describe('HTTP room control', () => {
    beforeEach(() => {
        roomState.current = createTestRoom({ id: '4821', password: 'party' });
        addVideoToRoom.mockClear();
        playVideoNowInRoom.mockClear();
        nextVideoInRoom.mockClear();
        loggerInfo.mockClear();
    });

    it('creates a session with the room password and redacts snapshot secrets', async () => {
        const redis = memoryRedis();
        const result = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });

        expect(result.sessionToken.length).toBeGreaterThanOrEqual(8);
        expect(result.bind).toEqual(bind);
        const snapshot = JSON.stringify(result.room);
        const agentDeviceId = Object.keys(roomState.current.participants)[0]!;
        expect(snapshot).not.toContain('party');
        expect(snapshot).not.toContain(result.sessionToken);
        expect(snapshot).not.toContain(agentDeviceId);
        expect(snapshot).not.toContain('hostDeviceId');
        expect(Object.values(result.room.participants)[0]?.isAgent).toBe(true);
        expect(Object.values(result.room.participants)[0]).not.toHaveProperty('deviceId');
        expect(roomState.current.clients).toEqual([]);
        expect(roomState.current.participants[agentDeviceId]?.role).toBe('member');
        const logged = JSON.stringify(loggerInfo.mock.calls);
        expect(logged).not.toContain('party');
        expect(logged).not.toContain(result.sessionToken);
        expect(logged).not.toMatch(/Bearer/i);
    });

    it('refuses passwordless roomId-only join', async () => {
        roomState.current = createTestRoom({ id: '4821' });
        const redis = memoryRedis();
        await expect(
            createHttpAgentSession(redis as never, { bind, ip: '1.1.1.1' }),
        ).rejects.toBeInstanceOf(RoomUnavailableError);
        expect(Object.keys(roomState.current.participants)).toHaveLength(0);
    });

    it('uses a joinToken once then refuses replay', async () => {
        roomState.current = createTestRoom({ id: '4821' });
        const redis = memoryRedis();
        const minted = await mintJoinToken(redis as never, '4821');
        const first = await createHttpAgentSession(redis as never, {
            bind,
            joinToken: minted.joinToken,
            ip: '1.1.1.1',
        });
        expect(first.sessionToken).toBeTruthy();
        await expect(
            createHttpAgentSession(redis as never, {
                bind,
                joinToken: minted.joinToken,
                ip: '1.1.1.1',
            }),
        ).rejects.toBeInstanceOf(RoomUnavailableError);
    });

    it('returns the same error for a wrong password and a missing room', async () => {
        const redis = memoryRedis();
        await expect(
            createHttpAgentSession(redis as never, {
                bind,
                password: 'nope',
                ip: '1.1.1.1',
            }),
        ).rejects.toMatchObject({ error: 'roomUnavailable', status: 401 });
        await expect(
            createHttpAgentSession(redis as never, {
                bind: { roomId: '9999', displayName: 'Claude' },
                password: 'party',
                ip: '1.1.1.1',
            }),
        ).rejects.toMatchObject({ error: 'roomUnavailable', status: 401 });
    });

    it('queues after hydrate and refuses a wrong-room bind without calling addVideo', async () => {
        const redis = memoryRedis();
        const session = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        const once = generateOnceToken();
        const search = vi.fn(async () => [video]);

        await httpQueue(redis as never, {
            bind,
            sessionToken: session.sessionToken,
            videoId: 'vid1',
            once,
            ip: '1.1.1.1',
            search,
        });
        expect(addVideoToRoom).toHaveBeenCalledTimes(1);

        const unusedOnce = generateOnceToken();
        await expect(
            httpQueue(redis as never, {
                bind: { roomId: '9999', displayName: 'Claude' },
                sessionToken: session.sessionToken,
                videoId: 'vid1',
                once: unusedOnce,
                ip: '1.1.1.1',
                search,
            }),
        ).rejects.toBeInstanceOf(RoomUnavailableError);
        expect(addVideoToRoom).toHaveBeenCalledTimes(1);
        expect(search).toHaveBeenCalledTimes(1);

        await httpQueue(redis as never, {
            bind,
            sessionToken: session.sessionToken,
            videoId: 'vid1',
            once: unusedOnce,
            ip: '1.1.1.1',
            search,
        });
        expect(addVideoToRoom).toHaveBeenCalledTimes(2);
        const snapshot = await getHttpAgentSession(redis as never, session.sessionToken);
        expect(snapshot.bind.roomId).toBe('4821');
    });

    it('replays once without hydrating again', async () => {
        const redis = memoryRedis();
        const session = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        const once = generateOnceToken();
        const search = vi.fn(async () => [video]);

        await httpQueue(redis as never, {
            bind,
            sessionToken: session.sessionToken,
            videoId: 'vid1',
            once,
            ip: '1.1.1.1',
            search,
        });
        await expect(
            httpQueue(redis as never, {
                bind,
                sessionToken: session.sessionToken,
                videoId: 'vid1',
                once,
                ip: '1.1.1.1',
                search,
            }),
        ).rejects.toBeInstanceOf(OnceReplayError);
        expect(search).toHaveBeenCalledTimes(1);
        expect(addVideoToRoom).toHaveBeenCalledTimes(1);
    });

    it('leaves only the agent participant', async () => {
        const redis = memoryRedis();
        const session = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        expect(Object.keys(roomState.current.participants)).toHaveLength(1);
        await leaveHttpAgentSession(redis as never, {
            bind,
            sessionToken: session.sessionToken,
        });
        expect(Object.keys(roomState.current.participants)).toHaveLength(0);
        await expect(getHttpAgentSession(redis as never, session.sessionToken)).rejects.toBeInstanceOf(
            RoomUnavailableError,
        );
    });

    it('refuses HTTP session on a sweep of passwordless rooms', async () => {
        const redis = memoryRedis();
        for (const roomId of ['0000', '0001', '4821']) {
            roomState.current = createTestRoom({ id: roomId });
            await expect(
                createHttpAgentSession(redis as never, {
                    bind: { roomId, displayName: 'Bot' },
                    ip: '9.9.9.9',
                }),
            ).rejects.toBeInstanceOf(RoomUnavailableError);
        }
    });

    it('rate-limits the 11th mutation in one minute', async () => {
        const redis = memoryRedis();
        const session = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        const search = vi.fn(async () => [video]);
        for (let i = 0; i < 10; i++) {
            await httpQueue(redis as never, {
                bind,
                sessionToken: session.sessionToken,
                videoId: 'vid1',
                once: generateOnceToken(),
                ip: '1.1.1.1',
                search,
            });
        }
        await expect(
            httpQueue(redis as never, {
                bind,
                sessionToken: session.sessionToken,
                videoId: 'vid1',
                once: generateOnceToken(),
                ip: '1.1.1.1',
                search,
            }),
        ).rejects.toBeInstanceOf(RateLimitedError);
        expect(addVideoToRoom).toHaveBeenCalledTimes(10);
    });

    it('refuses an unresolved videoId without mutating the queue', async () => {
        const redis = memoryRedis();
        const session = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        const search = vi.fn(async () => []);
        await expect(
            httpQueue(redis as never, {
                bind,
                sessionToken: session.sessionToken,
                videoId: 'missing',
                once: generateOnceToken(),
                ip: '1.1.1.1',
                search,
            }),
        ).rejects.toBeInstanceOf(VideoUnresolvedError);
        expect(addVideoToRoom).not.toHaveBeenCalled();
    });

    it('refuses a missing or expired once before hydrate', async () => {
        const redis = memoryRedis();
        const session = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        const search = vi.fn(async () => [video]);
        await expect(
            httpQueue(redis as never, {
                bind,
                sessionToken: session.sessionToken,
                videoId: 'vid1',
                ip: '1.1.1.1',
                search,
            }),
        ).rejects.toBeInstanceOf(RoomError);
        await expect(
            httpQueue(redis as never, {
                bind,
                sessionToken: session.sessionToken,
                videoId: 'vid1',
                once: generateOnceToken(),
                exp: Math.floor(Date.now() / 1000) - 10,
                ip: '1.1.1.1',
                search,
            }),
        ).rejects.toBeInstanceOf(RoomError);
        expect(search).not.toHaveBeenCalled();
        expect(addVideoToRoom).not.toHaveBeenCalled();
    });

    it('does not crown an agent when the host slot is empty', async () => {
        roomState.current = createTestRoom({ id: '4821', password: 'party', hostDeviceId: '' });
        const redis = memoryRedis();
        const session = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        const agent = Object.values(roomState.current.participants)[0];
        expect(agent?.role).toBe('member');
        expect(roomState.current.hostDeviceId).toBe('');
        expect(JSON.stringify(session.room)).not.toContain('hostDeviceId');
    });

    it('leaves the agent and keeps other participants', async () => {
        roomState.current = createTestRoom({
            id: '4821',
            password: 'party',
            participants: {
                tv: {
                    deviceId: 'tv',
                    displayName: 'TV',
                    role: 'host',
                    joinedAt: 1,
                    lastSeen: 1,
                    connectionIds: ['ws-tv'],
                    isTvConnection: true,
                    isAgent: false,
                },
            },
        });
        const redis = memoryRedis();
        const created = await createHttpAgentSession(redis as never, {
            bind,
            password: 'party',
            ip: '1.1.1.1',
        });
        expect(Object.keys(roomState.current.participants)).toHaveLength(2);
        await leaveHttpAgentSession(redis as never, {
            bind,
            sessionToken: created.sessionToken,
        });
        expect(Object.keys(roomState.current.participants)).toEqual(['tv']);
    });
});
