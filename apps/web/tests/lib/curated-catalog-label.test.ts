import { describe, expect, it } from 'vitest';

import { getCuratedCatalogLabel } from '@/lib/curated-catalog-label';
import type { CuratedCatalog } from '@vkara/curated-playlists';

const labels = { karaoke: 'Karaoke', music: 'Music' };

function catalog(id: string): CuratedCatalog {
    return { id, suggestLocales: ['vi'], playlists: [] };
}

describe('getCuratedCatalogLabel', () => {
    it('maps known catalog ids', () => {
        expect(getCuratedCatalogLabel(catalog('karaoke'), labels)).toBe('Karaoke');
        expect(getCuratedCatalogLabel(catalog('music'), labels)).toBe('Music');
    });

    it('falls back to raw id', () => {
        expect(getCuratedCatalogLabel(catalog('party'), labels)).toBe('party');
    });
});
