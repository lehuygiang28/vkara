import { parseYoutubePlaylistInput } from '@vkara/youtube';

import playlistsJson from '../playlists.json';
import type { CuratedCatalog, CuratedPlaylistsFile, UiLocale } from './schema';

const playlistsFile = playlistsJson as CuratedPlaylistsFile;

export type { CuratedCatalog, CuratedPlaylistsFile, UiLocale } from './schema';

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

function localePriority(catalog: CuratedCatalog, locale: UiLocale): number {
    return catalog.suggestLocales.indexOf(locale);
}

function mergeCatalogRowsById(rows: CuratedCatalog[]): CuratedCatalog[] {
    const merged: CuratedCatalog[] = [];
    const indexById = new Map<string, number>();

    for (const row of rows) {
        const existingIndex = indexById.get(row.id);
        if (existingIndex === undefined) {
            indexById.set(row.id, merged.length);
            merged.push(row);
            continue;
        }

        const existing = merged[existingIndex]!;
        merged[existingIndex] = {
            ...existing,
            playlists: [...existing.playlists, ...row.playlists],
        };
    }

    return merged;
}

/**
 * Include every catalog row whose `suggestLocales` contains the UI locale.
 * Rows tagged with only `vi` or only `en` are excluded on the other locale.
 * Matching rows with the same `id` are merged into one section; playlists are
 * concatenated after sorting rows by locale priority, then file order.
 */
export function filterCatalogsByLocale(
    catalogs: CuratedCatalog[],
    locale: UiLocale,
): CuratedCatalog[] {
    const sorted = catalogs
        .map((catalog, fileIndex) => ({ catalog, fileIndex }))
        .filter(
            ({ catalog }) =>
                catalog.suggestLocales.includes(locale) && catalog.playlists.length > 0,
        )
        .sort((a, b) => {
            const priorityDiff =
                localePriority(a.catalog, locale) - localePriority(b.catalog, locale);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            return a.fileIndex - b.fileIndex;
        })
        .map(({ catalog }) => ({
            ...catalog,
            playlists: [...catalog.playlists],
        }));

    return mergeCatalogRowsById(sorted);
}

export function getCuratedCatalogsForLocale(locale: UiLocale): CuratedCatalog[] {
    return filterCatalogsByLocale(loadCatalogs(), locale);
}
