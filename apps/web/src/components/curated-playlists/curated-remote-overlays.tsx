'use client';

import { useCuratedStore } from '@/store/curatedStore';

import { CuratedPlaylistPreviewOverlay } from './curated-playlist-preview-overlay';
import { ImportPlaylistPanel } from './import-playlist-panel';

/** Tab-independent overlays so back/close does not depend on which tab is mounted. */
export function CuratedRemoteOverlays() {
    const importPanelOpen = useCuratedStore((state) => state.importPlaylistPanelOpen);
    const curatedPreviewOpen = useCuratedStore((state) => state.curatedPreviewOpen);
    const activeListId = useCuratedStore((state) => state.activeListId);

    return (
        <>
            <ImportPlaylistPanel open={importPanelOpen} />
            {curatedPreviewOpen && activeListId ? (
                <CuratedPlaylistPreviewOverlay listId={activeListId} />
            ) : null}
        </>
    );
}
