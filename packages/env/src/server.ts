import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation, parseEnvOriginList } from './base';

export function serverEnv() {
    return createEnv({
        server: {
            NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
            PORT: z.coerce.number().int().positive().default(8000),
            SERVICE_REPORT_CRON: z.string().min(1).default('0 * * * *'),
            EMPTY_ROOM_TIMEOUT: z.coerce.number().int().positive().default(3600),
            /** Comma-separated browser origins allowed for CORS. Unset = allow all. */
            CORS_ORIGINS: z.string().optional(),
        },
        runtimeEnv: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            SERVICE_REPORT_CRON: process.env.SERVICE_REPORT_CRON,
            EMPTY_ROOM_TIMEOUT: process.env.EMPTY_ROOM_TIMEOUT,
            CORS_ORIGINS: process.env.CORS_ORIGINS,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}

/** Subset of `@elysiajs/cors` `CORSConfig` used by the API (`origin: true` or `origin: string[]`). */
export type CorsConfigInput = { origin: true } | { origin: string[] };

/**
 * Build `@elysiajs/cors` options from `CORS_ORIGINS` (comma-separated).
 * Unset → `{ origin: true }` (plugin default: reflect any request origin).
 * Set → `{ origin: string[] }` (plugin matches `Origin` against the list).
 */
export function resolveCorsConfig(corsOrigins: string | undefined): CorsConfigInput {
    const allowed = parseEnvOriginList(corsOrigins);
    if (allowed.length === 0) {
        return { origin: true };
    }

    for (const origin of allowed) {
        try {
            new URL(origin);
        } catch {
            throw new Error(`Invalid CORS origin: ${origin}`);
        }
    }

    return { origin: allowed };
}
