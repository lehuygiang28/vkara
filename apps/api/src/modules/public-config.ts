import { isExperimentsEnabled, type ExperimentsEnvValues } from '@vkara/env';

export type PublicConfigResponse = {
    experimentsEnabled: boolean;
};

export function buildPublicConfig(
    env: Pick<ExperimentsEnvValues, 'VKARA_EXPERIMENTS'>,
): PublicConfigResponse {
    return {
        experimentsEnabled: isExperimentsEnabled(env),
    };
}
