import { Elysia } from 'elysia';
import { z } from 'zod';

import { COMMAND_PATHS } from '@vkara/url-commands';
import { urlCommandDocumentSchema, urlCommandRoomIdSchema } from '@vkara/validators';
import { ErrorCode, RoomError } from '@vkara/room';

import { redis } from '@/redis';
import {
    buildBoundCommandUrl,
    echoBind,
    mintBoundJoinToken,
    mintOnce,
    validateCommandQuery,
} from '@/modules/url-commands/tools';
import {
    createHttpAgentSession,
    getHttpAgentSession,
    httpNext,
    httpPlay,
    httpQueue,
    leaveHttpAgentSession,
    OnceReplayError,
    VideoUnresolvedError,
} from '@/modules/url-commands/http-room-control';
import { assertMintBudget, CircuitOpenError, RateLimitedError } from '@/modules/url-commands/http-guardrails';
import { getRequestIp, readBearerToken } from '@/modules/url-commands/request-ip';
import { RoomUnavailableError, roomUnavailableBody } from '@/modules/url-commands/room-unavailable';
import { searchFirstPageItems } from '@/modules/youtube/search-first-page-items';

const bindSchema = z.object({
    roomId: urlCommandRoomIdSchema,
    displayName: z.string().trim().min(1).max(40),
});

const validateBodySchema = z.object({
    query: z.string(),
    bind: bindSchema,
});

const buildUrlBodySchema = z.object({
    origin: z.string().url(),
    path: z.enum(COMMAND_PATHS),
    command: urlCommandDocumentSchema,
    bind: bindSchema,
});

const bindOnlySchema = z.object({ bind: bindSchema });

const sessionCreateSchema = z.object({
    bind: bindSchema,
    password: z.string().optional(),
    joinToken: z.string().optional(),
});

const sessionCommandSchema = z.object({
    bind: bindSchema,
    sessionToken: z.string().min(8),
    once: z.string().optional(),
    exp: z.number().optional(),
    videoId: z.string().optional(),
});

function mapControlError(error: unknown, set: { status?: number | string }) {
    if (error instanceof RoomUnavailableError) {
        set.status = 401;
        return roomUnavailableBody();
    }
    if (error instanceof RateLimitedError) {
        set.status = 429;
        return { error: 'rateLimited' };
    }
    if (error instanceof CircuitOpenError) {
        set.status = 503;
        return { error: 'upstreamUnavailable' };
    }
    if (error instanceof OnceReplayError) {
        set.status = 409;
        return { error: 'onceReplay' };
    }
    if (error instanceof VideoUnresolvedError) {
        set.status = 404;
        return { error: 'videoUnresolved' };
    }
    if (error instanceof RoomError) {
        if (error.code === ErrorCode.ROOM_NOT_FOUND || error.code === ErrorCode.INCORRECT_PASSWORD) {
            set.status = 401;
            return roomUnavailableBody();
        }
        set.status = 400;
        return { error: error.code };
    }
    set.status = 400;
    return { error: error instanceof Error ? error.message : 'failed' };
}

export const urlCommandsElysia = new Elysia({ name: 'url-commands', prefix: '/url-commands' })
    .post('/validate', async ({ body, set }) => {
        const parsed = validateBodySchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { error: parsed.error.flatten() };
        }
        return {
            ...validateCommandQuery(parsed.data.query),
            bind: echoBind(parsed.data.bind),
        };
    })
    .post('/build-url', async ({ body, set }) => {
        const parsed = buildUrlBodySchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { error: parsed.error.flatten() };
        }
        try {
            return buildBoundCommandUrl(parsed.data);
        } catch (error) {
            set.status = 400;
            return { error: error instanceof Error ? error.message : 'build failed' };
        }
    })
    .post('/mint-once', async ({ body, set }) => {
        const parsed = bindOnlySchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { error: parsed.error.flatten() };
        }
        return { ...mintOnce(), bind: echoBind(parsed.data.bind) };
    })
    .post('/mint-join-token', async ({ body, set, request }) => {
        const parsed = z
            .object({
                bind: bindSchema,
                password: z.string().optional(),
            })
            .safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { error: parsed.error.flatten() };
        }
        try {
            await assertMintBudget(redis, getRequestIp(request));
            return await mintBoundJoinToken(redis, parsed.data.bind, parsed.data.password);
        } catch (error) {
            return mapControlError(error, set);
        }
    })
    .post('/session', async ({ body, set, request }) => {
        const parsed = sessionCreateSchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { error: parsed.error.flatten() };
        }
        try {
            return await createHttpAgentSession(redis, {
                bind: parsed.data.bind,
                password: parsed.data.password,
                joinToken: parsed.data.joinToken,
                ip: getRequestIp(request),
            });
        } catch (error) {
            return mapControlError(error, set);
        }
    })
    .get('/session', async ({ set, request }) => {
        const sessionToken = readBearerToken(request);
        if (!sessionToken) {
            set.status = 401;
            return roomUnavailableBody();
        }
        try {
            return await getHttpAgentSession(redis, sessionToken);
        } catch (error) {
            return mapControlError(error, set);
        }
    })
    .post('/leave', async ({ body, set, request }) => {
        const parsed = sessionCommandSchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { error: parsed.error.flatten() };
        }
        void request;
        try {
            return await leaveHttpAgentSession(redis, {
                bind: parsed.data.bind,
                sessionToken: parsed.data.sessionToken,
            });
        } catch (error) {
            return mapControlError(error, set);
        }
    })
    .post('/queue', async ({ body, set, request }) => {
        const parsed = sessionCommandSchema.safeParse(body);
        if (!parsed.success || !parsed.data.videoId) {
            set.status = 400;
            return { error: parsed.success ? 'videoId required' : parsed.error.flatten() };
        }
        try {
            return await httpQueue(redis, {
                bind: parsed.data.bind,
                sessionToken: parsed.data.sessionToken,
                videoId: parsed.data.videoId,
                once: parsed.data.once,
                exp: parsed.data.exp,
                ip: getRequestIp(request),
                search: searchFirstPageItems,
            });
        } catch (error) {
            return mapControlError(error, set);
        }
    })
    .post('/play', async ({ body, set, request }) => {
        const parsed = sessionCommandSchema.safeParse(body);
        if (!parsed.success || !parsed.data.videoId) {
            set.status = 400;
            return { error: parsed.success ? 'videoId required' : parsed.error.flatten() };
        }
        try {
            return await httpPlay(redis, {
                bind: parsed.data.bind,
                sessionToken: parsed.data.sessionToken,
                videoId: parsed.data.videoId,
                once: parsed.data.once,
                exp: parsed.data.exp,
                ip: getRequestIp(request),
                search: searchFirstPageItems,
            });
        } catch (error) {
            return mapControlError(error, set);
        }
    })
    .post('/next', async ({ body, set, request }) => {
        const parsed = sessionCommandSchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { error: parsed.error.flatten() };
        }
        try {
            return await httpNext(redis, {
                bind: parsed.data.bind,
                sessionToken: parsed.data.sessionToken,
                once: parsed.data.once,
                exp: parsed.data.exp,
                ip: getRequestIp(request),
            });
        } catch (error) {
            return mapControlError(error, set);
        }
    });
