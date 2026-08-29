import { z } from 'zod';

import { displayNameSchema } from './ws/client-message';

export const urlCommandRoomIdSchema = z.string().regex(/^\d{4}$/);

export const urlCommandOnceTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

export const urlCommandLayoutModeSchema = z.enum(['auto', 'remote', 'player', 'both']);

export const urlCommandKaraokeSchema = z.enum(['0', '1']);

export const urlCommandProviderSchema = z.enum(['youtube', 'tiktok']);

export const urlCommandTabSchema = z.enum(['search', 'queue', 'history', 'controls', 'settings']);

export const urlCommandNameSchema = displayNameSchema.min(1);

/**
 * Optional URL command document. Missing keys are no-ops.
 * Per-key parse lives in `@vkara/url-commands` so one invalid value cannot fail the rest.
 */
export const urlCommandDocumentSchema = z
    .object({
        roomId: urlCommandRoomIdSchema.optional(),
        password: z.string().trim().min(1).optional(),
        joinToken: urlCommandOnceTokenSchema.optional(),
        layoutMode: urlCommandLayoutModeSchema.optional(),
        q: z.string().trim().min(1).optional(),
        karaoke: urlCommandKaraokeSchema.optional(),
        provider: urlCommandProviderSchema.optional(),
        name: urlCommandNameSchema.optional(),
        tab: urlCommandTabSchema.optional(),
        agent: z.literal('1').optional(),
        queue: z.string().trim().min(1).optional(),
        play: z.string().trim().min(1).optional(),
        next: z.literal('1').optional(),
        once: urlCommandOnceTokenSchema.optional(),
        exp: z.coerce.number().int().optional(),
    })
    .strict();

export type UrlCommandDocument = z.infer<typeof urlCommandDocumentSchema>;
