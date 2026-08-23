import { describe, expect, it } from 'vitest';

import { getSearchConfig } from '../src/search-config';

describe('getSearchConfig', () => {
    it('uses documented defaults when env is unset', () => {
        expect(getSearchConfig({})).toEqual({
            sessionTtlMs: 600_000,
            pageSize: 12,
            maxDeviceSessions: 32,
            pruneIntervalMs: 60_000,
        });
    });

    it('reads VKARA_TIKTOK_SEARCH_* overrides', () => {
        expect(
            getSearchConfig({
                VKARA_TIKTOK_SEARCH_SESSION_TTL_SECONDS: '120',
                VKARA_TIKTOK_SEARCH_PAGE_SIZE: '24',
                VKARA_TIKTOK_SEARCH_MAX_DEVICE_SESSIONS: '8',
                VKARA_TIKTOK_SEARCH_PRUNE_INTERVAL_SECONDS: '30',
            }),
        ).toEqual({
            sessionTtlMs: 120_000,
            pageSize: 24,
            maxDeviceSessions: 8,
            pruneIntervalMs: 30_000,
        });
    });
});
