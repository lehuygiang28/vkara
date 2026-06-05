import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCuratedStore } from '@/store/curatedStore';
import { useYouTubeStore } from '@/store/youtubeStore';

function createMemoryStorage(): Storage {
    const map = new Map<string, string>();
    return {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (key) => map.get(key) ?? null,
        key: (index) => [...map.keys()][index] ?? null,
        removeItem: (key) => {
            map.delete(key);
        },
        setItem: (key, value) => {
            map.set(key, value);
        },
    };
}

describe('useCuratedStore', () => {
    beforeEach(() => {
        useCuratedStore.setState({
            curatedPreviewOpen: false,
            curatedDismissed: false,
            activeListId: null,
            curatedPreviewReturnTo: null,
            importPlaylistPanelOpen: false,
        });
    });

    it('reopens import panel when preview was opened from import', () => {
        useCuratedStore.getState().setImportPlaylistPanelOpen(true);
        useCuratedStore.getState().openCuratedPreview('PLtest', { returnTo: 'import' });

        expect(useCuratedStore.getState().importPlaylistPanelOpen).toBe(false);
        expect(useCuratedStore.getState().curatedPreviewOpen).toBe(true);

        useCuratedStore.getState().closeCuratedPreview();

        expect(useCuratedStore.getState().curatedPreviewOpen).toBe(false);
        expect(useCuratedStore.getState().importPlaylistPanelOpen).toBe(true);
    });

    it('does not reopen import panel after import all dismisses preview', () => {
        useCuratedStore.getState().openCuratedPreview('PLtest', { returnTo: 'import' });
        useCuratedStore.getState().closeCuratedPreview({ restoreReturnTo: false });

        expect(useCuratedStore.getState().importPlaylistPanelOpen).toBe(false);
    });

    it('closes import panel when the active remote tab changes', () => {
        vi.stubGlobal('localStorage', createMemoryStorage());

        useCuratedStore.getState().setImportPlaylistPanelOpen(true);
        useYouTubeStore.getState().setCurrentTab('search');

        expect(useCuratedStore.getState().importPlaylistPanelOpen).toBe(false);
    });

    it('closes curated preview when the active remote tab changes', () => {
        vi.stubGlobal('localStorage', createMemoryStorage());

        useCuratedStore.getState().openCuratedPreview('PLtest', { returnTo: 'import' });
        useYouTubeStore.getState().setCurrentTab('controls');

        expect(useCuratedStore.getState().curatedPreviewOpen).toBe(false);
        expect(useCuratedStore.getState().activeListId).toBeNull();
        expect(useCuratedStore.getState().importPlaylistPanelOpen).toBe(false);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });
});
