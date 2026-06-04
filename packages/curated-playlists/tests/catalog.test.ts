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

const duplicateIdFile: CuratedPlaylistsFile = {
    version: 1,
    catalogs: [
        {
            id: 'karaoke',
            suggestLocales: ['vi', 'en'],
            playlists: [
                'https://www.youtube.com/playlist?list=PLVIET1111111111111111111111111111',
            ],
        },
        {
            id: 'music',
            suggestLocales: ['vi', 'en'],
            playlists: [
                'https://www.youtube.com/playlist?list=PLMUSIC111111111111111111111111111',
            ],
        },
        {
            id: 'karaoke',
            suggestLocales: ['en', 'vi'],
            playlists: [
                'https://www.youtube.com/playlist?list=PLENGLISH222222222222222222222222',
            ],
        },
    ],
};

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

    it('merges duplicate ids into one section with locale-priority playlist order', () => {
        const vi = filterCatalogsByLocale(loadCatalogs(duplicateIdFile), 'vi');
        expect(vi.map((catalog) => catalog.id)).toEqual(['karaoke', 'music']);
        expect(vi[0]?.playlists).toHaveLength(2);
        expect(vi[0]?.playlists[0]).toContain('PLVIET111');
        expect(vi[0]?.playlists[1]).toContain('PLENGLISH222');

        const en = filterCatalogsByLocale(loadCatalogs(duplicateIdFile), 'en');
        expect(en.map((catalog) => catalog.id)).toEqual(['karaoke', 'music']);
        expect(en[0]?.playlists).toHaveLength(2);
        expect(en[0]?.playlists[0]).toContain('PLENGLISH222');
        expect(en[0]?.playlists[1]).toContain('PLVIET111');
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

    it('merges shipped karaoke rows into one section per locale', () => {
        const vi = getCuratedCatalogsForLocale('vi');
        const en = getCuratedCatalogsForLocale('en');
        const viKaraoke = vi.find((catalog) => catalog.id === 'karaoke');
        const enKaraoke = en.find((catalog) => catalog.id === 'karaoke');

        expect(vi.filter((catalog) => catalog.id === 'karaoke')).toHaveLength(1);
        expect(en.filter((catalog) => catalog.id === 'karaoke')).toHaveLength(1);
        expect(viKaraoke?.playlists).toHaveLength(4);
        expect(enKaraoke?.playlists).toHaveLength(4);
        expect(enKaraoke?.playlists[0]).toContain('PLRH1bes7ddmWO-sNw14I-FxKKvxMujKoc');
    });
});
