import { describe, expect, it } from 'vitest';

import {
    filterCatalogsByLocale,
    flattenCatalogEntries,
    getCuratedCatalogsForLocale,
    loadCatalogs,
} from '@src/index';
import type { CuratedPlaylistsFile } from '@src/schema';

const sampleFile: CuratedPlaylistsFile = {
    version: 1,
    catalogs: [
        {
            id: 'karaoke',
            suggestLocales: ['vi', 'en'],
            playlists: [
                'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
                'https://www.youtube.com/playlist?list=PLRH1bes7ddmVMYRkmPNJY4lFZsGlAAXbC',
            ],
        },
        {
            id: 'music',
            suggestLocales: ['en'],
            playlists: [],
        },
        {
            id: 'vi-only',
            suggestLocales: ['vi'],
            playlists: [
                'https://www.youtube.com/playlist?list=PLRH1bes7ddmVp0Cpe2OWJxK6zqA2h8CrD',
            ],
        },
    ],
};

describe('loadCatalogs', () => {
    it('loads shipped curated starters from playlists.json', () => {
        const catalogs = loadCatalogs();
        const karaoke = catalogs.find((catalog) => catalog.id === 'karaoke');
        const music = catalogs.find((catalog) => catalog.id === 'music');
        expect(karaoke?.playlists).toHaveLength(3);
        expect(music?.playlists).toHaveLength(1);
        expect(music?.playlists[0]).toContain('PLRH1bes7ddmWZCJsf02s3WLhtMV2dXbWO');
    });

    it('rejects invalid playlist URLs', () => {
        expect(() =>
            loadCatalogs({
                version: 1,
                catalogs: [
                    {
                        id: 'bad',
                        suggestLocales: ['en'],
                        playlists: ['not-a-playlist'],
                    },
                ],
            }),
        ).toThrow();
    });
});

describe('filterCatalogsByLocale', () => {
    it('keeps catalog order and playlist order for matching locale', () => {
        const filtered = filterCatalogsByLocale(loadCatalogs(sampleFile), 'vi');
        expect(filtered.map((catalog) => catalog.id)).toEqual(['karaoke', 'vi-only']);
        expect(filtered[0]?.playlists[0]).toContain('PLFgquLnL59');
    });

    it('omits empty catalogs', () => {
        const filtered = filterCatalogsByLocale(loadCatalogs(sampleFile), 'en');
        expect(filtered.map((catalog) => catalog.id)).toEqual(['karaoke']);
        expect(filtered.some((catalog) => catalog.id === 'music')).toBe(false);
    });

    it('excludes catalogs without locale tag', () => {
        const filtered = filterCatalogsByLocale(loadCatalogs(sampleFile), 'en');
        expect(filtered.some((catalog) => catalog.id === 'vi-only')).toBe(false);
    });
});

describe('flattenCatalogEntries', () => {
    it('parses list ids from URLs', () => {
        const entries = flattenCatalogEntries(filterCatalogsByLocale(loadCatalogs(sampleFile), 'vi'));
        expect(entries[0]?.listId).toBe('PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
        expect(entries[0]?.catalogId).toBe('karaoke');
    });
});

describe('getCuratedCatalogsForLocale', () => {
    it('returns non-empty catalogs for en', () => {
        expect(getCuratedCatalogsForLocale('en').length).toBeGreaterThan(0);
    });
});
