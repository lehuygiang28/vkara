'use client';

import type { CuratedCatalog } from '@vkara/curated-playlists';
import { parseYoutubePlaylistInput } from '@vkara/youtube';

import { getCuratedCatalogLabel } from '@/lib/curated-catalog-label';
import { useScopedI18n } from '@/locales/client';
import { useCuratedStore } from '@/store/curatedStore';

import { CuratedPlaylistCard } from './curated-playlist-card';

type CuratedCatalogSectionProps = {
    catalog: CuratedCatalog;
    horizontal?: boolean;
    onPlaylistOpenAction?: (listId: string) => void;
};

export function CuratedCatalogSection({
    catalog,
    horizontal = false,
    onPlaylistOpenAction,
}: CuratedCatalogSectionProps) {
    const t = useScopedI18n('curatedPlaylists');
    const openCuratedPreview = useCuratedStore((state) => state.openCuratedPreview);

    const openPlaylist = (listId: string) => {
        if (onPlaylistOpenAction) {
            onPlaylistOpenAction(listId);
            return;
        }
        openCuratedPreview(listId);
    };

    return (
        <section className={horizontal ? 'px-safe-offset pb-4' : 'space-y-2'}>
            <h3
                className={
                    horizontal
                        ? 'mb-3 text-sm font-medium text-foreground'
                        : 'text-xs font-medium uppercase tracking-wide text-muted-foreground'
                }
            >
                {getCuratedCatalogLabel(catalog, {
                    karaoke: t('catalogs.karaoke'),
                    music: t('catalogs.music'),
                })}
            </h3>
            <div
                className={
                    horizontal
                        ? 'flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                        : 'flex flex-col gap-2'
                }
            >
                {catalog.playlists.map((playlistUrl) => {
                    const { listId } = parseYoutubePlaylistInput(playlistUrl);
                    return (
                        <CuratedPlaylistCard
                            key={listId}
                            listId={listId}
                            layout={horizontal ? 'tile' : 'list'}
                            onOpen={() => openPlaylist(listId)}
                            className={horizontal ? undefined : 'w-full'}
                        />
                    );
                })}
            </div>
        </section>
    );
}
