import { create } from 'zustand';

export type CuratedPreviewReturnTo = 'import';

type OpenCuratedPreviewOptions = {
    returnTo?: CuratedPreviewReturnTo;
};

type CuratedStore = {
    curatedPreviewOpen: boolean;
    curatedDismissed: boolean;
    activeListId: string | null;
    curatedPreviewReturnTo: CuratedPreviewReturnTo | null;
    importPlaylistPanelOpen: boolean;
    openCuratedPreview: (listId: string, options?: OpenCuratedPreviewOptions) => void;
    closeCuratedPreview: (options?: { restoreReturnTo?: boolean }) => void;
    setImportPlaylistPanelOpen: (open: boolean) => void;
    dismissCuratedStarters: () => void;
};

export const useCuratedStore = create<CuratedStore>((set, get) => ({
    curatedPreviewOpen: false,
    curatedDismissed: false,
    activeListId: null,
    curatedPreviewReturnTo: null,
    importPlaylistPanelOpen: false,
    openCuratedPreview: (listId, options) => {
        const returnTo = options?.returnTo ?? null;
        set({
            curatedPreviewOpen: true,
            activeListId: listId,
            curatedPreviewReturnTo: returnTo,
            importPlaylistPanelOpen: returnTo === 'import' ? false : get().importPlaylistPanelOpen,
        });
    },
    closeCuratedPreview: (options) => {
        const shouldRestore = options?.restoreReturnTo !== false;
        const returnTo = shouldRestore ? get().curatedPreviewReturnTo : null;
        set({
            curatedPreviewOpen: false,
            activeListId: null,
            curatedPreviewReturnTo: null,
            ...(returnTo === 'import' ? { importPlaylistPanelOpen: true } : {}),
        });
    },
    setImportPlaylistPanelOpen: (open) =>
        set({
            importPlaylistPanelOpen: open,
            ...(open
                ? {
                      curatedPreviewOpen: false,
                      activeListId: null,
                      curatedPreviewReturnTo: null,
                  }
                : {}),
        }),
    dismissCuratedStarters: () => set({ curatedDismissed: true }),
}));
