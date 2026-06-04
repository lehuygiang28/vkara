import { parseYoutubePlaylistInput } from '@vkara/shared-utils';

import playlistsJson from '../playlists.json';
import type { CuratedCatalog, CuratedCatalogEntry, CuratedPlaylistsFile, UiLocale } from './schema';

const playlistsFile = playlistsJson as CuratedPlaylistsFile;

export type { CuratedCatalog, CuratedCatalogEntry, CuratedPlaylistsFile, UiLocale } from './schema';

function isUiLocale(value: string): value is UiLocale {
    return value === 'vi' || value === 'en';
}

function assertCatalogShape(catalog: unknown, index: number): asserts catalog is CuratedCatalog {
    if (!catalog || typeof catalog !== 'object') {
        throw new Error(`Catalog at index ${index} must be an object`);
    }

    const row = catalog as Record<string, unknown>;
    if (typeof row.id !== 'string' || !row.id.trim()) {
        throw new Error(`Catalog at index ${index} requires a non-empty id`);
    }
    if (!Array.isArray(row.suggestLocales) || row.suggestLocales.length === 0) {
        throw new Error(`Catalog "${row.id}" requires suggestLocales`);
    }
    if (!row.suggestLocales.every((locale) => typeof locale === 'string' && isUiLocale(locale))) {
        throw new Error(`Catalog "${row.id}" has invalid suggestLocales`);
    }
    if (!Array.isArray(row.playlists)) {
        throw new Error(`Catalog "${row.id}" requires a playlists array`);
    }
    for (const url of row.playlists) {
        if (typeof url !== 'string' || !url.trim()) {
            throw new Error(`Catalog "${row.id}" has an invalid playlist URL`);
        }
        parseYoutubePlaylistInput(url);
    }
}

export function loadCatalogs(file: CuratedPlaylistsFile = playlistsFile): CuratedCatalog[] {
    if (!file || typeof file !== 'object' || !Array.isArray(file.catalogs)) {
        throw new Error('Invalid curated playlists file: catalogs array required');
    }

    file.catalogs.forEach((catalog, index) => assertCatalogShape(catalog, index));
    return file.catalogs;
}

export function filterCatalogsByLocale(
    catalogs: CuratedCatalog[],
    locale: UiLocale,
): CuratedCatalog[] {
    return catalogs
        .filter((catalog) => catalog.suggestLocales.includes(locale))
        .map((catalog) => ({
            ...catalog,
            playlists: [...catalog.playlists],
        }))
        .filter((catalog) => catalog.playlists.length > 0);
}

export function flattenCatalogEntries(catalogs: CuratedCatalog[]): CuratedCatalogEntry[] {
    const entries: CuratedCatalogEntry[] = [];

    for (const catalog of catalogs) {
        for (const playlistUrl of catalog.playlists) {
            const parsed = parseYoutubePlaylistInput(playlistUrl);
            entries.push({
                catalogId: catalog.id,
                listId: parsed.listId,
                playlistUrl,
            });
        }
    }

    return entries;
}

export function getCuratedCatalogsForLocale(locale: UiLocale): CuratedCatalog[] {
    return filterCatalogsByLocale(loadCatalogs(), locale);
}
