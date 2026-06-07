import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation } from './base';

/** Absolute URL or AIO-style relative path (e.g. `/api/vkara`). */
const publicEndpointUrl = z.union([
    z.string().url(),
    z.string().refine((value) => value.startsWith('/'), {
        message: 'Relative public endpoint must start with /',
    }),
]);

export function webPublicEnv() {
    return createEnv({
        client: {
            NEXT_PUBLIC_API_URL: publicEndpointUrl.optional(),
            /** TikTok search API origin; falls back to `NEXT_PUBLIC_API_URL` when unset. */
            NEXT_PUBLIC_TIKTOK_API_URL: publicEndpointUrl.optional(),
            NEXT_PUBLIC_WS_URL: publicEndpointUrl.optional(),
            NEXT_PUBLIC_APP_URL: z.string().url().optional(),
            NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
            NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN: z.string().optional(),
            NEXT_PUBLIC_VKARA_EXPERIMENTS: z.string().optional(),
        },
        runtimeEnv: {
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
            NEXT_PUBLIC_TIKTOK_API_URL: process.env.NEXT_PUBLIC_TIKTOK_API_URL,
            NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
            NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN:
                process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
            NEXT_PUBLIC_VKARA_EXPERIMENTS: process.env.NEXT_PUBLIC_VKARA_EXPERIMENTS,
        },
        clientPrefix: 'NEXT_PUBLIC_',
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}
