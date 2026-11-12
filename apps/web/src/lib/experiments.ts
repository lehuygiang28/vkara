import { isExperimentsEnabledOnWeb } from '@vkara/env';

import { env } from '@/env';

export function isExperimentsEnabled(): boolean {
    return isExperimentsEnabledOnWeb({
        NEXT_PUBLIC_VKARA_EXPERIMENTS: env.NEXT_PUBLIC_VKARA_EXPERIMENTS,
    });
}
