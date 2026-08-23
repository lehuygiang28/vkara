import { randomUUID } from 'node:crypto';

import { getSearchConfig, type SearchConfig } from './search-config';
import type { TikTokVideo } from './types';

export type SearchSession = {
    deviceId: string;
    keyword: string;
    searchId: string;
    baseSignedUrl: string;
    cachedVideos: TikTokVideo[];
    tiktokNextCursor: number;
    tiktokHasMore: boolean;
    createdAt: number;
    updatedAt: number;
};

export type ResetSessionResult = {
    session: SearchSession;
    sessionReset: boolean;
    evictedLru: boolean;
};

export type SessionStoreSnapshot = {
    activeDeviceSessions: number;
    cachedTotal: number;
};

function createSearchSessionId(): string {
    return randomUUID();
}

export class DeviceSessionStore {
    private readonly sessions = new Map<string, SearchSession>();
    private pruneTimer: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly config: SearchConfig = getSearchConfig()) {}

    get size(): number {
        return this.sessions.size;
    }

    get maxDeviceSessions(): number {
        return this.config.maxDeviceSessions;
    }

    snapshot(): SessionStoreSnapshot {
        let cachedTotal = 0;
        for (const session of this.sessions.values()) {
            cachedTotal += session.cachedVideos.length;
        }
        return {
            activeDeviceSessions: this.sessions.size,
            cachedTotal,
        };
    }

    startPeriodicPrune(onPruned?: (count: number) => void): void {
        if (this.pruneTimer) return;

        this.pruneTimer = setInterval(() => {
            const pruned = this.pruneExpired();
            if (pruned > 0) {
                onPruned?.(pruned);
            }
        }, this.config.pruneIntervalMs);
        this.pruneTimer.unref?.();
    }

    stopPeriodicPrune(): void {
        if (!this.pruneTimer) return;
        clearInterval(this.pruneTimer);
        this.pruneTimer = null;
    }

    /** Reuse the device slot on every new search (`cursor === 0`). */
    resetSession(deviceId: string, keyword: string): ResetSessionResult {
        this.pruneExpired();

        const existing = this.sessions.get(deviceId);
        if (existing) {
            existing.keyword = keyword;
            existing.searchId = createSearchSessionId();
            existing.baseSignedUrl = '';
            existing.cachedVideos = [];
            existing.tiktokNextCursor = 0;
            existing.tiktokHasMore = false;
            existing.updatedAt = Date.now();
            return { session: existing, sessionReset: true, evictedLru: false };
        }

        let evictedLru = false;
        if (this.sessions.size >= this.config.maxDeviceSessions) {
            this.evictLru();
            evictedLru = true;
        }

        const now = Date.now();
        const session: SearchSession = {
            deviceId,
            keyword,
            searchId: createSearchSessionId(),
            baseSignedUrl: '',
            cachedVideos: [],
            tiktokNextCursor: 0,
            tiktokHasMore: false,
            createdAt: now,
            updatedAt: now,
        };
        this.sessions.set(deviceId, session);
        return { session, sessionReset: false, evictedLru };
    }

    getSessionForLoadMore(
        deviceId: string,
        searchId: string,
        keyword: string,
    ): SearchSession | null {
        const session = this.sessions.get(deviceId);
        if (!session) return null;
        if (session.searchId !== searchId || session.keyword !== keyword) return null;
        session.updatedAt = Date.now();
        return session;
    }

    pruneExpired(now = Date.now()): number {
        let pruned = 0;
        for (const [deviceId, session] of this.sessions) {
            if (now - session.updatedAt > this.config.sessionTtlMs) {
                this.sessions.delete(deviceId);
                pruned += 1;
            }
        }
        return pruned;
    }

    clear(): void {
        this.sessions.clear();
    }

    private evictLru(): void {
        let oldestDeviceId: string | null = null;
        let oldestUpdatedAt = Infinity;

        for (const [deviceId, session] of this.sessions) {
            if (session.updatedAt < oldestUpdatedAt) {
                oldestUpdatedAt = session.updatedAt;
                oldestDeviceId = deviceId;
            }
        }

        if (oldestDeviceId) {
            this.sessions.delete(oldestDeviceId);
        }
    }
}
