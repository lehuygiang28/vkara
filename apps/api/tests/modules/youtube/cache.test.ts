import { describe, expect, it } from 'vitest';

import { getRedisKey, REDIS_KEY_PREFIXES } from '@/modules/youtube/cache';

describe('getRedisKey', () => {
    it('concatenates prefix and continuation token', () => {
        expect(getRedisKey(REDIS_KEY_PREFIXES.SEARCH, 'token-abc')).toBe(
            'search-instance:token-abc',
        );
        expect(getRedisKey(REDIS_KEY_PREFIXES.RELATED, 'next-page')).toBe(
            'related-instance:next-page',
        );
    });

    it('handles empty continuation', () => {
        expect(getRedisKey(REDIS_KEY_PREFIXES.SEARCH, '')).toBe('search-instance:');
    });
});
