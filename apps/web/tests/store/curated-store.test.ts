import { beforeEach, describe, expect, it } from 'vitest';

import { useCuratedStore } from '@/store/curatedStore';

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
});
