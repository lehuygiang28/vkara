import { beforeEach, describe, expect, it, vi } from 'vitest';

const experimentsEnv = vi.hoisted(() => ({
    publicOverride: undefined as string | undefined,
}));

const storeState = vi.hoisted(() => ({
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    experimentsEnabled: false,
}));

vi.mock('@/env', () => ({
    env: {
        get NEXT_PUBLIC_VKARA_EXPERIMENTS() {
            return experimentsEnv.publicOverride;
        },
    },
}));

vi.mock('@/store/experimentsConfigStore', () => ({
    useExperimentsConfigStore: Object.assign(
        (selector: (s: typeof storeState) => unknown) => selector(storeState),
        { getState: () => storeState },
    ),
}));

import { isExperimentsEnabled } from '@/lib/experiments';

describe('isExperimentsEnabled runtime', () => {
    beforeEach(() => {
        experimentsEnv.publicOverride = undefined;
        storeState.status = 'idle';
        storeState.experimentsEnabled = false;
    });

    it('uses API config when NEXT_PUBLIC override is unset and config is ready', () => {
        storeState.status = 'ready';
        storeState.experimentsEnabled = true;
        expect(isExperimentsEnabled()).toBe(true);
    });

    it('stays disabled until API config is ready', () => {
        storeState.status = 'loading';
        storeState.experimentsEnabled = true;
        expect(isExperimentsEnabled()).toBe(false);
    });

    it('honours NEXT_PUBLIC build override in development when set', () => {
        vi.stubEnv('NODE_ENV', 'development');
        experimentsEnv.publicOverride = '1';
        expect(isExperimentsEnabled()).toBe(true);
        vi.unstubAllEnvs();
    });

    it('ignores NEXT_PUBLIC in production and uses API config', () => {
        vi.stubEnv('NODE_ENV', 'production');
        experimentsEnv.publicOverride = '0';
        storeState.status = 'ready';
        storeState.experimentsEnabled = true;
        expect(isExperimentsEnabled()).toBe(true);
        vi.unstubAllEnvs();
    });
});
