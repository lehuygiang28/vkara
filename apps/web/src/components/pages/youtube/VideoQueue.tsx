'use client';

import { useCallback } from 'react';
import { Trash2, MoveUp, Shuffle, ListMusic, Search, ListVideo } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@vkara/youtube';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { CuratedPlaylistsPanel } from '@/components/curated-playlists/curated-playlists-panel';
import { TooltipButton } from '@/components/tooltip-button';
import { useCuratedStore } from '@/store/curatedStore';
import { VideoList, type VideoListActionHelpers } from './VideoList';
import { VideoListActionBar } from './video-list-action-bar';
import { VideoListToolbar } from './video-list-toolbar';
import { VideoListEmptyState } from './video-list-empty-state';

export function VideoQueue() {
    const { room, setCurrentTab } = useYouTubeStore();
    const {
        handleRemoveVideoFromQueue,
        handleMoveVideoToTop,
        handleShuffleQueue,
        handleClearQueue,
    } = usePlayerAction();
    const t = useScopedI18n('videoQueue');
    const setImportPlaylistPanelOpen = useCuratedStore((state) => state.setImportPlaylistPanelOpen);

    const renderActions = useCallback(
        (video: YouTubeVideo, { closeMenu }: VideoListActionHelpers) => (
            <VideoListActionBar
                actions={[
                    {
                        id: 'priority',
                        label: t('moveToTop'),
                        buttonText: t('moveToTopShort'),
                        icon: <MoveUp />,
                        tone: 'priority',
                        onClick: () => {
                            closeMenu();
                            handleMoveVideoToTop(video);
                        },
                    },
                    {
                        id: 'remove',
                        label: t('remove'),
                        buttonText: t('remove'),
                        icon: <Trash2 />,
                        tone: 'destructive',
                        onClick: () => {
                            closeMenu();
                            handleRemoveVideoFromQueue(video);
                        },
                    },
                ]}
            />
        ),
        [t, handleMoveVideoToTop, handleRemoveVideoFromQueue],
    );

    return (
        <div className="flex h-full min-h-0 flex-col">
            <VideoListToolbar
                leading={
                    <>
                        <TooltipButton
                            tooltipContent={t('importPlaylistDescription')}
                            buttonText={t('importPlaylist')}
                            icon={<ListMusic />}
                            onConfirm={() => setImportPlaylistPanelOpen(true)}
                        />
                        {(room?.videoQueue?.length || 0) > 2 ? (
                            <TooltipButton
                                tooltipContent={t('shuffle')}
                                buttonText={t('shuffle')}
                                icon={<Shuffle />}
                                onConfirm={handleShuffleQueue}
                            />
                        ) : null}
                    </>
                }
                trailing={
                    (room?.videoQueue?.length || 0) > 0 ? (
                        <TooltipButton
                            tooltipContent={t('clearQueue')}
                            buttonText={t('clearQueue')}
                            icon={<Trash2 />}
                            onConfirm={handleClearQueue}
                            confirmMode
                            confirmContent={t('clearQueueConfirm')}
                            variant="destructive"
                        />
                    ) : null
                }
            />
            <VideoList
                keyPrefix="queue-list"
                videos={room?.videoQueue || []}
                emptyState={
                    <div className="flex w-full flex-col items-center">
                        <VideoListEmptyState
                            icon={<ListVideo className="h-7 w-7 text-muted-foreground" />}
                            title={t('noVideos')}
                            description={t('noVideosHint')}
                            actions={[
                                {
                                    label: t('searchCta'),
                                    icon: <Search />,
                                    onClick: () => setCurrentTab('search'),
                                },
                            ]}
                            className="flex-none"
                        />
                        <CuratedPlaylistsPanel variant="compact" showHeading />
                    </div>
                }
                renderActions={renderActions}
            />
        </div>
    );
}
