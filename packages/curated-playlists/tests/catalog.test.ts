import { describe, expect, it } from 'vitest';

import {
    filterCatalogsByLocale,
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
    it('filters by locale, omits empty catalogs, and keeps playlist order', () => {
        const vi = filterCatalogsByLocale(loadCatalogs(sampleFile), 'vi');
        expect(vi.map((catalog) => catalog.id)).toEqual(['karaoke', 'vi-only']);
        expect(vi[0]?.playlists[0]).toContain('PLFgquLnL59');

        const en = filterCatalogsByLocale(loadCatalogs(sampleFile), 'en');
        expect(en.map((catalog) => catalog.id)).toEqual(['karaoke']);
        expect(en.some((catalog) => catalog.id === 'music')).toBe(false);
        expect(en.some((catalog) => catalog.id === 'vi-only')).toBe(false);
    });

    it('merges duplicate ids with locale-priority playlist order', () => {
        const vi = filterCatalogsByLocale(loadCatalogs(duplicateIdFile), 'vi');
        expect(vi.map((catalog) => catalog.id)).toEqual(['karaoke', 'music']);
        expect(vi[0]?.playlists).toEqual([
            expect.stringContaining('PLVIET111'),
            expect.stringContaining('PLENGLISH222'),
        ]);

        const en = filterCatalogsByLocale(loadCatalogs(duplicateIdFile), 'en');
        expect(en[0]?.playlists).toEqual([
            expect.stringContaining('PLENGLISH222'),
            expect.stringContaining('PLVIET111'),
        ]);
    });

    it('merges shipped duplicate karaoke rows for each UI locale', () => {
        for (const locale of ['vi', 'en'] as const) {
            const catalogs = filterCatalogsByLocale(loadCatalogs(), locale);
            const karaoke = catalogs.find((catalog) => catalog.id === 'karaoke');
            expect(catalogs.filter((catalog) => catalog.id === 'karaoke')).toHaveLength(1);
            expect(karaoke?.playlists).toHaveLength(4);
        }

        const enKaraoke = getCuratedCatalogsForLocale('en').find((catalog) => catalog.id === 'karaoke');
        expect(enKaraoke?.playlists[0]).toContain('PLRH1bes7ddmWO-sNw14I-FxKKvxMujKoc');
    });
});
