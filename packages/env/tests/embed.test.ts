import { describe, expect, it } from 'vitest';

import {
    DEFAULT_EMBED_CACHE_TTL_SECONDS,
    getEmbedCacheTtlSeconds,
    isEmbedPrefilterAtListEnabled,
} from '../src/embed';

describe('embed env helpers', () => {
    it('prefilter flag is off when unset', () => {
        expect(isEmbedPrefilterAtListEnabled({})).toBe(false);
    });

    it('prefilter flag uses shared boolean format', () => {
        expect(
            isEmbedPrefilterAtListEnabled({ VKARA_EMBED_PREFILTER_AT_LIST: 'true' }),
        ).toBe(true);
        expect(isEmbedPrefilterAtListEnabled({ VKARA_EMBED_PREFILTER_AT_LIST: '0' })).toBe(
            false,
        );
    });

    it('TTL defaults to 30 days', () => {
        expect(getEmbedCacheTtlSeconds({})).toBe(DEFAULT_EMBED_CACHE_TTL_SECONDS);
    });

    it('parses TTL from embed env values', () => {
        expect(getEmbedCacheTtlSeconds({ VKARA_EMBED_CACHE_TTL_SECONDS: '3600' })).toBe(3600);
    });
});
