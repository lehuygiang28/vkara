import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation } from './base';

/** Next.js server-only variables (route handlers, not exposed to client bundle). */
export function webServerEnv() {
    return createEnv({
        server: {
            WHISPER_URL: z.string().url().optional(),
            HF_TOKEN: z.string().optional(),
            VKARA_AIO: z.string().optional(),
            GOOGLE_SITE_VERIFICATION: z.string().optional(),
            ANALYZE: z.string().optional(),
            NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
            VERCEL_ENV: z.string().optional(),
            VERCEL_URL: z.string().optional(),
        },
        runtimeEnv: {
            WHISPER_URL: process.env.WHISPER_URL,
            HF_TOKEN: process.env.HF_TOKEN,
            VKARA_AIO: process.env.VKARA_AIO,
            GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
            ANALYZE: process.env.ANALYZE,
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_ENV: process.env.VERCEL_ENV,
            VERCEL_URL: process.env.VERCEL_URL,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}
