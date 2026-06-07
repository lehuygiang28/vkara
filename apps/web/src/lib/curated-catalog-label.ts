import type { CuratedCatalog } from '@vkara/curated-playlists';

export type CuratedCatalogLabels = {
    karaoke: string;
    music: string;
};

export function getCuratedCatalogLabel(
    catalog: CuratedCatalog,
    labels: CuratedCatalogLabels,
): string {
    if (catalog.id === 'karaoke') {
        return labels.karaoke;
    }
    if (catalog.id === 'music') {
        return labels.music;
    }
    return catalog.id;
}
