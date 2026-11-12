import { describe, expect, it } from 'vitest';

import { buildPublicConfig } from '@/modules/public-config';

describe('buildPublicConfig', () => {
    it('reflects VKARA_EXPERIMENTS on the API', () => {
        expect(buildPublicConfig({ VKARA_EXPERIMENTS: '1' })).toEqual({
            experimentsEnabled: true,
        });
        expect(buildPublicConfig({ VKARA_EXPERIMENTS: '0' })).toEqual({
            experimentsEnabled: false,
        });
        expect(buildPublicConfig({})).toEqual({ experimentsEnabled: false });
    });
});
