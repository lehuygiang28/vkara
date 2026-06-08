import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (key: string) => map.get(key) ?? null,
        key: (index: number) => [...map.keys()][index] ?? null,
        removeItem: (key: string) => {
            map.delete(key);
        },
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
    });
});

const experimentsEnabled = vi.hoisted(() => ({ value: true }));

vi.mock('@/lib/experiments', () => ({
    isExperimentsEnabled: () => experimentsEnabled.value,
}));

vi.mock('@/services/youtube-api', () => ({
    searchYoutube: vi.fn().mockResolvedValue({ items: [], continuation: null }),
    getYoutubeSuggestions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/search-providers', () => ({
    searchFirstPage: vi.fn().mockResolvedValue({ items: [], continuation: null, searchId: null }),
    searchNextPage: vi.fn(),
    canLoadMoreSearchPages: vi.fn(() => true),
    supportsSearchSuggestions: vi.fn(() => true),
}));

import { searchFirstPage } from '@/lib/search-providers';
import { reconcileVideoProviderWithExperiments } from '@/lib/reconcile-experiments-provider';
import { getEffectiveVideoProvider, isTikTokProviderActive } from '@/lib/video-provider';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useSearchStore } from '@/store/searchStore';

describe('getEffectiveVideoProvider', () => {
    beforeEach(() => {
        experimentsEnabled.value = true;
        useAppSettingsStore.setState({ videoProvider: 'youtube' });
    });

    it('returns youtube when experiments are disabled', () => {
        experimentsEnabled.value = false;
        useAppSettingsStore.setState({ videoProvider: 'tiktok' });

        expect(getEffectiveVideoProvider()).toBe('youtube');
        expect(isTikTokProviderActive()).toBe(false);
    });

    it('returns persisted provider when experiments are enabled', () => {
        useAppSettingsStore.setState({ videoProvider: 'tiktok' });

        expect(getEffectiveVideoProvider()).toBe('tiktok');
        expect(isTikTokProviderActive()).toBe(true);
    });
});

describe('reconcileVideoProviderWithExperiments', () => {
    beforeEach(() => {
        experimentsEnabled.value = false;
        useAppSettingsStore.setState({ videoProvider: 'youtube' });
        useSearchStore.setState({
            searchQuery: '',
            searchResults: [],
            tiktokSearchId: null,
            isLoading: false,
            isLoadingMore: false,
        });
    });

    afterEach(() => {
        experimentsEnabled.value = true;
    });

    it('no-ops when experiments are enabled', () => {
        experimentsEnabled.value = true;
        useAppSettingsStore.setState({ videoProvider: 'tiktok' });

        expect(reconcileVideoProviderWithExperiments()).toBe(false);
        expect(useAppSettingsStore.getState().videoProvider).toBe('tiktok');
    });

    it('resets persisted tiktok provider to youtube', () => {
        useAppSettingsStore.setState({ videoProvider: 'tiktok' });

        expect(reconcileVideoProviderWithExperiments()).toBe(true);
        expect(useAppSettingsStore.getState().videoProvider).toBe('youtube');
    });

    it('clears stale tiktok search session and re-searches on youtube', async () => {
        useAppSettingsStore.setState({ videoProvider: 'tiktok' });
        useSearchStore.setState({
            searchQuery: 'karaoke mix',
            searchResults: [
                {
                    id: 'tt-1',
                    title: 'TikTok clip',
                    duration: 30,
                    duration_formatted: '0:30',
                    type: 'video',
                    uploadedAt: '',
                    url: 'https://www.tiktok.com/@u/video/tt-1',
                    views: 0,
                    channels: [],
                    thumbnails: [],
                    source: 'tiktok',
                },
            ],
            tiktokSearchId: 'session-1',
        });

        expect(reconcileVideoProviderWithExperiments()).toBe(true);
        expect(useSearchStore.getState().searchResults).toEqual([]);
        expect(useSearchStore.getState().tiktokSearchId).toBeNull();
        expect(vi.mocked(searchFirstPage)).toHaveBeenCalledWith(
            expect.objectContaining({ query: 'karaoke mix' }),
        );
    });
});

describe('setVideoProvider guard', () => {
    beforeEach(() => {
        experimentsEnabled.value = false;
        useAppSettingsStore.setState({ videoProvider: 'youtube' });
    });

    afterEach(() => {
        experimentsEnabled.value = true;
    });

    it('blocks selecting tiktok when experiments are disabled', () => {
        useAppSettingsStore.getState().setVideoProvider('tiktok');

        expect(useAppSettingsStore.getState().videoProvider).toBe('youtube');
    });
});
