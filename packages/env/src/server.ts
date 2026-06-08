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

function validateCorsOriginUrls(origins: string[]): string[] {
    for (const origin of origins) {
        try {
            new URL(origin);
        } catch {
            throw new Error(`Invalid CORS origin: ${origin}`);
        }
    }
    return origins;
}

/** `null` = allow any origin (CORS_ORIGINS unset). */
export function getCorsOriginAllowlist(corsOrigins: string | undefined): string[] | null {
    const allowed = parseEnvOriginList(corsOrigins);
    if (allowed.length === 0) {
        return null;
    }
    return validateCorsOriginUrls(allowed);
}

/** Shared HTTP + WebSocket origin gate from `CORS_ORIGINS`. */
export function isCorsOriginAllowed(
    requestOrigin: string | null | undefined,
    corsOrigins: string | undefined,
): boolean {
    const allowlist = getCorsOriginAllowlist(corsOrigins);
    if (allowlist === null) {
        return true;
    }
    if (!requestOrigin) {
        return false;
    }
    return allowlist.includes(requestOrigin);
}

/**
 * CORS response headers for the WebSocket upgrade handshake (`upgrade` hook).
 * `@elysiajs/cors` only runs on HTTP lifecycle hooks and does not cover WS upgrades.
 */
export function resolveWsUpgradeCorsHeaders(
    requestOrigin: string | null,
    corsOrigins: string | undefined,
): Record<string, string> {
    if (!requestOrigin || !isCorsOriginAllowed(requestOrigin, corsOrigins)) {
        return {};
    }

    return {
        'access-control-allow-origin': requestOrigin,
        vary: 'Origin',
        'access-control-allow-credentials': 'true',
    };
}

/**
 * Build `@elysiajs/cors` options from `CORS_ORIGINS` (comma-separated).
 * Unset → `{ origin: true }` (plugin default: reflect any request origin).
 * Set → `{ origin: string[] }` (plugin matches `Origin` against the list).
 */
export function resolveCorsConfig(corsOrigins: string | undefined): CorsConfigInput {
    const allowlist = getCorsOriginAllowlist(corsOrigins);
    if (allowlist === null) {
        return { origin: true };
    }
    return { origin: allowlist };
}
