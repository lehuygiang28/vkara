import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation, parseEnvFlagValue } from './base';

export type ExperimentsEnvValues = Pick<
    ReturnType<typeof experimentsEnv>,
    'VKARA_EXPERIMENTS' | 'NEXT_PUBLIC_VKARA_EXPERIMENTS'
>;

export function experimentsEnv() {
    return createEnv({
        server: {
            VKARA_EXPERIMENTS: z.string().optional(),
        },
        client: {
            NEXT_PUBLIC_VKARA_EXPERIMENTS: z.string().optional(),
        },
        runtimeEnv: {
            VKARA_EXPERIMENTS: process.env.VKARA_EXPERIMENTS,
            NEXT_PUBLIC_VKARA_EXPERIMENTS: process.env.NEXT_PUBLIC_VKARA_EXPERIMENTS,
        },
        clientPrefix: 'NEXT_PUBLIC_',
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}

/** When enabled, TikTok search API and Experiments Settings are available. Default: off. */
export function isExperimentsEnabled(
    env: Pick<ExperimentsEnvValues, 'VKARA_EXPERIMENTS'> | ExperimentsEnvValues,
): boolean {
    return parseEnvFlagValue(env.VKARA_EXPERIMENTS, false);
}

/** Web client mirror for Settings visibility (falls back to server flag when unset). */
export function isExperimentsEnabledOnWeb(env: ExperimentsEnvValues): boolean {
    if (env.NEXT_PUBLIC_VKARA_EXPERIMENTS !== undefined) {
        return parseEnvFlagValue(env.NEXT_PUBLIC_VKARA_EXPERIMENTS, false);
    }
    return isExperimentsEnabled(env);
}
