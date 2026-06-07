import { createEnv } from '@t3-oss/env-core';
import {
    embedEnv,
    envSkipValidation,
    experimentsEnv,
    loggerEnv,
    redisEnv,
    serverEnv,
} from '@vkara/env';

export const env = createEnv({
    extends: [embedEnv(), experimentsEnv(), redisEnv(), serverEnv(), loggerEnv()],
    server: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    skipValidation: envSkipValidation(),
});
