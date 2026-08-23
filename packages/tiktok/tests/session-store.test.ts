import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SearchConfig } from '../src/search-config';
import { DeviceSessionStore } from '../src/session-store';

function testConfig(overrides: Partial<SearchConfig> = {}): SearchConfig {
    return {
        sessionTtlMs: 60_000,
        pageSize: 12,
        maxDeviceSessions: 2,
        pruneIntervalMs: 60_000,
        ...overrides,
    };
}

describe('DeviceSessionStore', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('reuses the same device slot and bumps searchId on keyword change', () => {
        const store = new DeviceSessionStore(testConfig());
        const first = store.resetSession('device-a', 'bro');
        const firstSearchId = first.session.searchId;
        first.session.cachedVideos.push({
            id: '1',
            desc: 'old',
            createTime: 0,
            duration: 0,
            cover: '',
            coverUrls: [],
            playUrl: '',
            isLive: false,
            isImagePost: false,
            imageCount: 0,
            author: { uniqueId: 'u', nickname: 'n' },
            stats: { playCount: 0, diggCount: 0, commentCount: 0, shareCount: 0 },
            url: '',
        });

        const second = store.resetSession('device-a', 'karaoke');

        expect(second.sessionReset).toBe(true);
        expect(second.evictedLru).toBe(false);
        expect(second.session.searchId).not.toBe(firstSearchId);
        expect(second.session.keyword).toBe('karaoke');
        expect(second.session.cachedVideos).toHaveLength(0);
        expect(store.size).toBe(1);
    });

    it('keeps independent sessions per device', () => {
        const store = new DeviceSessionStore(testConfig({ maxDeviceSessions: 4 }));
        const sessionA = store.resetSession('device-a', 'bro').session;
        const sessionB = store.resetSession('device-b', 'karaoke').session;

        expect(store.size).toBe(2);
        expect(sessionA.searchId).not.toBe(sessionB.searchId);
        expect(store.getSessionForLoadMore('device-a', sessionA.searchId, 'bro')).toBe(sessionA);
        expect(store.getSessionForLoadMore('device-b', sessionB.searchId, 'karaoke')).toBe(
            sessionB,
        );
    });

    it('rejects stale searchId after keyword reset', () => {
        const store = new DeviceSessionStore(testConfig());
        const first = store.resetSession('device-a', 'bro');
        const staleSearchId = first.session.searchId;

        const second = store.resetSession('device-a', 'karaoke');

        expect(store.getSessionForLoadMore('device-a', staleSearchId, 'bro')).toBeNull();
        expect(store.getSessionForLoadMore('device-a', second.session.searchId, 'karaoke')).toBe(
            second.session,
        );
    });

    it('evicts the least recently used device when at capacity', () => {
        const store = new DeviceSessionStore(testConfig({ maxDeviceSessions: 2 }));
        store.resetSession('device-a', 'one');
        const deviceB = store.resetSession('device-b', 'two').session;
        vi.setSystemTime(Date.now() + 1_000);
        store.getSessionForLoadMore('device-b', deviceB.searchId, 'two');

        const third = store.resetSession('device-c', 'three');
        expect(third.evictedLru).toBe(true);
        expect(store.size).toBe(2);
        expect(store.getSessionForLoadMore('device-a', 'any', 'one')).toBeNull();
        expect(store.getSessionForLoadMore('device-c', third.session.searchId, 'three')).not.toBeNull();
    });

    it('prunes idle sessions after TTL', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

        const store = new DeviceSessionStore(testConfig({ sessionTtlMs: 10_000 }));
        store.resetSession('device-a', 'bro');
        expect(store.size).toBe(1);

        vi.advanceTimersByTime(11_000);
        expect(store.pruneExpired()).toBe(1);
        expect(store.size).toBe(0);
    });
});
