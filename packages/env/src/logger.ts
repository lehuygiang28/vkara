import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation } from './base';

export function loggerEnv() {
    return createEnv({
        server: {
            LOG_TO_FILES: z.string().optional(),
            LOG_LEVEL: z.string().default('info'),
            ERROR_LOG_PATH: z.string().default('logs/error.log'),
            COMBINED_LOG_PATH: z.string().default('logs/combined.log'),
        },
        runtimeEnv: {
            LOG_TO_FILES: process.env.LOG_TO_FILES,
            LOG_LEVEL: process.env.LOG_LEVEL,
            ERROR_LOG_PATH: process.env.ERROR_LOG_PATH,
            COMBINED_LOG_PATH: process.env.COMBINED_LOG_PATH,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}
