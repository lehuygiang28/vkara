import { createEnv } from '@t3-oss/env-core';
import {
    embedEnv,
    envSkipValidation,
    experimentsEnv,
    loggerEnv,
    playwrightProxyEnv,
    redisEnv,
    serverEnv,
    tlsEnv,
} from '@vkara/env';

export const env = createEnv({
    extends: [
        embedEnv(),
        experimentsEnv(),
        playwrightProxyEnv(),
        redisEnv(),
        serverEnv(),
        tlsEnv(),
        loggerEnv(),
    ],
    server: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    skipValidation: envSkipValidation(),
});
