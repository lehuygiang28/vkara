export type CuratedPlaylistsFile = {
    version: number;
    catalogs: Array<{
        id: string;
        suggestLocales: UiLocale[];
        playlists: string[];
    }>;
};

export type CuratedCatalog = CuratedPlaylistsFile['catalogs'][number];

export type CuratedCatalogEntry = {
    catalogId: string;
    listId: string;
    playlistUrl: string;
};

export type UiLocale = 'vi' | 'en';
