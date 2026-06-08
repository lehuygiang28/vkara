import { getVideoSource } from '@vkara/youtube';

import { isExperimentsEnabled } from '@/lib/experiments';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useSearchStore } from '@/store/searchStore';

function hasStaleTikTokSearchSession(): boolean {
    const { searchResults, tiktokSearchId } = useSearchStore.getState();
    if (tiktokSearchId) {
        return true;
    }
    return searchResults.some((video) => getVideoSource(video) === 'tiktok');
}

/**
 * When experiments are turned off, reset persisted TikTok provider preference and
 * clear in-memory TikTok search state so users route back to YouTube without Settings UI.
 */
export function reconcileVideoProviderWithExperiments(): boolean {
    if (isExperimentsEnabled()) {
        return false;
    }

    const settings = useAppSettingsStore.getState();
    const hadTikTokProvider = settings.videoProvider === 'tiktok';
    const hadTikTokSearch = hasStaleTikTokSearchSession();

    if (!hadTikTokProvider && !hadTikTokSearch) {
        return false;
    }

    if (hadTikTokProvider) {
        settings.setVideoProvider('youtube');
    }

    const search = useSearchStore.getState();
    const query = search.searchQuery.trim();
    search.clearSearchResultsForProviderSwitch();

    if (query) {
        void search.performSearch(query);
    }

    return true;
}
