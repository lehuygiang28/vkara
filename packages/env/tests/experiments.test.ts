import { describe, expect, it } from 'vitest';

import { isExperimentsEnabled, isExperimentsEnabledOnWeb } from '../src/experiments';

describe('isExperimentsEnabled', () => {
    it('reads VKARA_EXPERIMENTS for server/runtime', () => {
        expect(isExperimentsEnabled({ VKARA_EXPERIMENTS: '1' })).toBe(true);
        expect(isExperimentsEnabled({ VKARA_EXPERIMENTS: '0' })).toBe(false);
        expect(isExperimentsEnabled({})).toBe(false);
    });
});

describe('isExperimentsEnabledOnWeb', () => {
    it('defaults to disabled when NEXT_PUBLIC is unset', () => {
        expect(isExperimentsEnabledOnWeb({})).toBe(false);
    });

    it('does not read VKARA_EXPERIMENTS when NEXT_PUBLIC is unset', () => {
        expect(
            isExperimentsEnabledOnWeb({
                VKARA_EXPERIMENTS: '1',
            }),
        ).toBe(false);
    });

    it('uses only NEXT_PUBLIC_VKARA_EXPERIMENTS when set', () => {
        expect(isExperimentsEnabledOnWeb({ NEXT_PUBLIC_VKARA_EXPERIMENTS: '1' })).toBe(true);
        expect(isExperimentsEnabledOnWeb({ NEXT_PUBLIC_VKARA_EXPERIMENTS: '0' })).toBe(false);
    });
});
