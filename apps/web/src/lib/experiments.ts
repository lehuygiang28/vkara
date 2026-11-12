import { isExperimentsEnabledOnWeb } from '@vkara/env';

import { env } from '@/env';
import { useExperimentsConfigStore } from '@/store/experimentsConfigStore';

function readBuildTimeExperimentsOverride(): boolean | undefined {
    const raw = env.NEXT_PUBLIC_VKARA_EXPERIMENTS;
    if (raw === undefined) {
        return undefined;
    }
    // Production bundles may bake a default `false`; runtime gate comes from API `/config`.
    if (process.env.NODE_ENV === 'production') {
        return undefined;
    }
    return isExperimentsEnabledOnWeb({ NEXT_PUBLIC_VKARA_EXPERIMENTS: raw });
}

/** Runtime gate: API `/config` (default). Optional `NEXT_PUBLIC_VKARA_EXPERIMENTS` overrides for local web-only dev. */
export function isExperimentsEnabled(): boolean {
    const buildOverride = readBuildTimeExperimentsOverride();
    if (buildOverride !== undefined) {
        return buildOverride;
    }

    const { status, experimentsEnabled } = useExperimentsConfigStore.getState();
    if (status !== 'ready') {
        return false;
    }
    return experimentsEnabled;
}

export function useExperimentsEnabled(): boolean {
    const buildOverride = readBuildTimeExperimentsOverride();
    const fromApi = useExperimentsConfigStore((state) =>
        state.status === 'ready' ? state.experimentsEnabled : false,
    );
    if (buildOverride !== undefined) {
        return buildOverride;
    }
    return fromApi;
}
