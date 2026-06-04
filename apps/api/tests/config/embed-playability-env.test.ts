import { afterEach, describe, expect, it } from 'vitest';

import { VkaraEmbedEnv } from '@vkara/env/flags';
import {
    DEFAULT_EMBED_CACHE_TTL_SECONDS,
    getEmbedCacheTtlSeconds,
    isEmbedPrefilterAtListEnabled,
} from '@vkara/env/embed';

describe('embed playability env', () => {
    const previousPrefilter = process.env[VkaraEmbedEnv.PREFILTER_AT_LIST];
    const previousTtl = process.env[VkaraEmbedEnv.CACHE_TTL_SECONDS];

    afterEach(() => {
        restoreEnv(VkaraEmbedEnv.PREFILTER_AT_LIST, previousPrefilter);
        restoreEnv(VkaraEmbedEnv.CACHE_TTL_SECONDS, previousTtl);
    });

    it('prefilter flag is off by default', () => {
        delete process.env[VkaraEmbedEnv.PREFILTER_AT_LIST];
        expect(isEmbedPrefilterAtListEnabled()).toBe(false);
    });

    it('prefilter flag uses shared boolean format', () => {
        process.env[VkaraEmbedEnv.PREFILTER_AT_LIST] = 'true';
        expect(isEmbedPrefilterAtListEnabled()).toBe(true);

        process.env[VkaraEmbedEnv.PREFILTER_AT_LIST] = '0';
        expect(isEmbedPrefilterAtListEnabled()).toBe(false);
    });

    it('TTL defaults to 30 days', () => {
        delete process.env[VkaraEmbedEnv.CACHE_TTL_SECONDS];
        expect(getEmbedCacheTtlSeconds()).toBe(DEFAULT_EMBED_CACHE_TTL_SECONDS);
    });

    it('reads VKARA_EMBED_CACHE_TTL_SECONDS from env', () => {
        process.env[VkaraEmbedEnv.CACHE_TTL_SECONDS] = '3600';
        expect(getEmbedCacheTtlSeconds()).toBe(3600);
    });
});

function restoreEnv(key: string, previous: string | undefined): void {
    if (previous === undefined) {
        delete process.env[key];
    } else {
        process.env[key] = previous;
    }
}
