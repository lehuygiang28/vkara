import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation } from './base';

export function serverEnv() {
    return createEnv({
        server: {
            NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
            PORT: z.coerce.number().int().positive().default(8000),
            SERVICE_REPORT_CRON: z.string().min(1).default('0 * * * *'),
            EMPTY_ROOM_TIMEOUT: z.coerce.number().int().positive().default(3600),
        },
        runtimeEnv: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            SERVICE_REPORT_CRON: process.env.SERVICE_REPORT_CRON,
            EMPTY_ROOM_TIMEOUT: process.env.EMPTY_ROOM_TIMEOUT,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}
