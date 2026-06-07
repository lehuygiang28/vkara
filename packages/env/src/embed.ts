import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation, parseEnvFlagValue, parseEnvPositiveIntValue } from './base';

export const DEFAULT_EMBED_CACHE_TTL_SECONDS = 30 * 24 * 3600;

/** Embed-related env strings from `embedEnv()` or `apps/api/src/env.ts`. */
export type EmbedEnvValues = Pick<
    ReturnType<typeof embedEnv>,
    'VKARA_EMBED_PREFILTER_AT_LIST' | 'VKARA_EMBED_CACHE_TTL_SECONDS'
>;

export function embedEnv() {
    return createEnv({
        server: {
            VKARA_EMBED_PREFILTER_AT_LIST: z.string().optional(),
            VKARA_EMBED_CACHE_TTL_SECONDS: z.string().optional(),
            PUBLIC_APP_URL: z.string().url().optional(),
            APP_PUBLIC_URL: z.string().url().optional(),
            WEB_ORIGIN: z.string().url().optional(),
        },
        runtimeEnv: {
            VKARA_EMBED_PREFILTER_AT_LIST: process.env.VKARA_EMBED_PREFILTER_AT_LIST,
            VKARA_EMBED_CACHE_TTL_SECONDS: process.env.VKARA_EMBED_CACHE_TTL_SECONDS,
            PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
            APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
            WEB_ORIGIN: process.env.WEB_ORIGIN,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}

/** When enabled, search/related/playlist preview omit non-embeddable videos. Default: off. */
export function isEmbedPrefilterAtListEnabled(embed: EmbedEnvValues): boolean {
    return parseEnvFlagValue(embed.VKARA_EMBED_PREFILTER_AT_LIST, false);
}

export function getEmbedCacheTtlSeconds(embed: EmbedEnvValues): number {
    return parseEnvPositiveIntValue(
        embed.VKARA_EMBED_CACHE_TTL_SECONDS,
        DEFAULT_EMBED_CACHE_TTL_SECONDS,
    );
}

/** First set public app URL for embed playability checks. */
export function resolvePublicAppUrl(env: ReturnType<typeof embedEnv>): string | undefined {
    return env.PUBLIC_APP_URL ?? env.APP_PUBLIC_URL ?? env.WEB_ORIGIN;
}
