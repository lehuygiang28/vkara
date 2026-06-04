import { createEnv } from '@t3-oss/env-core';
import {
    embedEnv,
    envSkipValidation,
    loggerEnv,
    redisEnv,
    serverEnv,
} from '@vkara/env';

export const env = createEnv({
    extends: [embedEnv(), redisEnv(), serverEnv(), loggerEnv()],
    server: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    skipValidation: envSkipValidation(),
});
