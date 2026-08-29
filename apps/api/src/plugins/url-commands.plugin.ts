import { Elysia } from 'elysia';
import { z } from 'zod';

import { COMMAND_PATHS } from '@vkara/url-commands';
import { urlCommandDocumentSchema, urlCommandRoomIdSchema } from '@vkara/validators';

import { redis } from '@/redis';
import {
    buildBoundCommandUrl,
    echoBind,
    mintBoundJoinToken,
    mintOnce,
    validateCommandQuery,
} from '@/modules/url-commands/tools';

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
    .post('/mint-join-token', async ({ body, set }) => {
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
            return await mintBoundJoinToken(redis, parsed.data.bind, parsed.data.password);
        } catch (error) {
            set.status = 400;
            return { error: error instanceof Error ? error.message : 'mint failed' };
        }
    });
