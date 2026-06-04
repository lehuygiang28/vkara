import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation } from './base';

export function redisEnv() {
    return createEnv({
        server: {
            REDIS_HOST: z.string().min(1).default('localhost'),
            REDIS_PORT: z.coerce.number().int().positive().default(6379),
            REDIS_PASSWORD: z.string().optional(),
        },
        runtimeEnv: {
            REDIS_HOST: process.env.REDIS_HOST,
            REDIS_PORT: process.env.REDIS_PORT,
            REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}
