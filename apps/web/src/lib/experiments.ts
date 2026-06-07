import { isExperimentsEnabledOnWeb } from '@vkara/env';

import { env } from '@/env';

export function isExperimentsEnabled(): boolean {
    return isExperimentsEnabledOnWeb(env);
}
