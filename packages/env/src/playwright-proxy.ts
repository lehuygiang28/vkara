import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation } from './base';

export function playwrightProxyEnv() {
    return createEnv({
        server: {
            /** Playwright proxy URL, e.g. http://127.0.0.1:1080 or https://proxy.example.com */
            PLAYWRIGHT_PROXY_SERVER: z.string().min(1).optional(),
            PLAYWRIGHT_PROXY_USERNAME: z.string().min(1).optional(),
            PLAYWRIGHT_PROXY_PASSWORD: z.string().min(1).optional(),
            /** When set, api-redis entrypoint starts `cloudflared access tcp` before the API. */
            CF_PROXY_TUNNEL_HOSTNAME: z.string().min(1).optional(),
            /** Local bind for cloudflared access tcp (default 127.0.0.1:1080). */
            CF_PROXY_TUNNEL_LOCAL_URL: z.string().min(1).default('127.0.0.1:1080'),
            CF_ACCESS_CLIENT_ID: z.string().min(1).optional(),
            CF_ACCESS_CLIENT_SECRET: z.string().min(1).optional(),
        },
        runtimeEnv: {
            PLAYWRIGHT_PROXY_SERVER: process.env.PLAYWRIGHT_PROXY_SERVER,
            PLAYWRIGHT_PROXY_USERNAME: process.env.PLAYWRIGHT_PROXY_USERNAME,
            PLAYWRIGHT_PROXY_PASSWORD: process.env.PLAYWRIGHT_PROXY_PASSWORD,
            CF_PROXY_TUNNEL_HOSTNAME: process.env.CF_PROXY_TUNNEL_HOSTNAME,
            CF_PROXY_TUNNEL_LOCAL_URL: process.env.CF_PROXY_TUNNEL_LOCAL_URL,
            CF_ACCESS_CLIENT_ID: process.env.CF_ACCESS_CLIENT_ID,
            CF_ACCESS_CLIENT_SECRET: process.env.CF_ACCESS_CLIENT_SECRET,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}
