'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ListMusic } from 'lucide-react';

import {
    RemotePanelOverlayHeader,
    RemotePanelOverlayShell,
} from '@/components/pages/youtube/remote-panel-overlay-shell';
import { VideoList } from '@/components/pages/youtube/VideoList';
import { RemotePageGutter, RemoteScrollRoot } from '@/components/pages/youtube/remote-chrome';
import { useVideoSearchListActions } from '@/components/pages/youtube/use-video-search-list-actions';
import { VideoSkeletonListForViewport } from '@/components/video-skeleton';
import { Button } from '@/components/ui/button';
import { useScopedI18n } from '@/locales/client';
import { usePlaylistDetailsCache } from '@/hooks/use-playlist-details-cache';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useCuratedStore } from '@/store/curatedStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const PREVIEW_VIDEO_LIMIT = 100;

type CuratedPlaylistPreviewOverlayProps = {
    listId: string;
};

export function CuratedPlaylistPreviewOverlay({ listId }: CuratedPlaylistPreviewOverlayProps) {
    const t = useScopedI18n('curatedPlaylists');
    const closeCuratedPreview = useCuratedStore((state) => state.closeCuratedPreview);
    const setCurrentTab = useYouTubeStore((state) => state.setCurrentTab);
    const { load, getEntry } = usePlaylistDetailsCache();
    const { handleImportPlaylist } = usePlayerAction();
    const renderActions = useVideoSearchListActions();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const skeletonScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(null);

        void load(listId, { videoLimit: PREVIEW_VIDEO_LIMIT })
            .catch(() => {
                if (!cancelled) {
                    setLoadError(t('previewLoadError'));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [listId, load, t]);

    const entry = getEntry(listId);
    const details = entry?.data;
    const videos = details?.videos ?? [];

    const handleClose = useCallback(() => {
        closeCuratedPreview();
    }, [closeCuratedPreview]);

    const handleImportAll = useCallback(() => {
        handleImportPlaylist(listId);
        closeCuratedPreview({ restoreReturnTo: false });
        setCurrentTab('queue');
    }, [closeCuratedPreview, handleImportPlaylist, listId, setCurrentTab]);

    const showSkeleton = loading && videos.length === 0;

    return (
        <RemotePanelOverlayShell
            active
            ariaLabel={details?.playlist.title ?? t('previewTitle')}
            bodyMode="list"
            header={
                <RemotePanelOverlayHeader
                    onCloseAction={handleClose}
                    title={details?.playlist.title ?? t('previewTitle')}
                    description={
                        details?.playlist.videoCount !== undefined
                            ? t('videoCount', { count: details.playlist.videoCount })
                            : undefined
                    }
                    trailing={
                        <Button
                            type="button"
                            className="min-h-11 shrink-0"
                            onClick={handleImportAll}
                            disabled={loading}
                        >
                            <ListMusic className="h-4 w-4" />
                            {t('addAll')}
                        </Button>
                    }
                />
            }
        >
            {showSkeleton ? (
                <RemoteScrollRoot ref={skeletonScrollRef} className="h-full">
                    <RemotePageGutter>
                        <VideoSkeletonListForViewport
                            scrollRef={skeletonScrollRef}
                            className="pt-2"
                        />
                    </RemotePageGutter>
                </RemoteScrollRoot>
            ) : (
                <VideoList
                    videos={videos}
                    emptyState={
                        loadError ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                {loadError}
                            </div>
                        ) : undefined
                    }
                    renderActions={renderActions}
                />
            )}
        </RemotePanelOverlayShell>
    );
}
