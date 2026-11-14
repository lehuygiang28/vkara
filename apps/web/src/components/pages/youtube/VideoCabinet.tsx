'use client';

import { useCallback } from 'react';
import { ListVideo, MoveUp, Play, Search, Star, Trash2 } from 'lucide-react';
import type { YouTubeVideo } from '@vkara/youtube';

import { TooltipButton } from '@/components/tooltip-button';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useScopedI18n } from '@/locales/client';
import { useCabinetStore } from '@/store/cabinetStore';
import { useYouTubeStore } from '@/store/youtubeStore';

import { useCabinetSaveAction } from './use-cabinet-save-action';
import { VideoList, type VideoListActionHelpers } from './VideoList';
import { VideoListActionBar } from './video-list-action-bar';
import { VideoListEmptyState } from './video-list-empty-state';
import { VideoListToolbar } from './video-list-toolbar';

export function VideoCabinet() {
    const videos = useCabinetStore((state) => state.videos);
    const clear = useCabinetStore((state) => state.clear);
    const cabinetSaveAction = useCabinetSaveAction();
    const { setCurrentTab } = useYouTubeStore();
    const {
        handlePlayVideoNow,
        handleAddVideoToQueue,
        handleAddVideoAndMoveToTop,
        handleAddVideos,
    } = usePlayerAction();
    const t = useScopedI18n('videoCabinet');

    const renderActions = useCallback(
        (video: YouTubeVideo, helpers: VideoListActionHelpers) => (
            <VideoListActionBar
                actions={[
                    {
                        id: 'play',
                        label: t('playNow'),
                        buttonText: t('playNowShort'),
                        icon: <Play />,
                        tone: 'success',
                        onClick: () => {
                            helpers.closeMenu();
                            handlePlayVideoNow(video);
                        },
                    },
                    {
                        id: 'queue',
                        label: t('addToQueue'),
                        buttonText: t('addToQueueShort'),
                        icon: <ListVideo />,
                        onClick: () => {
                            helpers.closeMenu();
                            handleAddVideoToQueue(video);
                        },
                    },
                    {
                        id: 'priority',
                        label: t('playNext'),
                        buttonText: t('playNextShort'),
                        icon: <MoveUp />,
                        tone: 'priority',
                        onClick: () => {
                            helpers.closeMenu();
                            handleAddVideoAndMoveToTop(video);
                        },
                    },
                    cabinetSaveAction(video, helpers),
                ]}
            />
        ),
        [
            cabinetSaveAction,
            handleAddVideoAndMoveToTop,
            handleAddVideoToQueue,
            handlePlayVideoNow,
            t,
        ],
    );

    return (
        <div className="flex h-full min-h-0 flex-col">
            {videos.length > 0 ? (
                <VideoListToolbar
                    leading={
                        <TooltipButton
                            tooltipContent={t('addAll')}
                            buttonText={t('addAll')}
                            icon={<Star />}
                            onConfirm={() => {
                                void handleAddVideos(videos);
                            }}
                        />
                    }
                    trailing={
                        <TooltipButton
                            tooltipContent={t('clear')}
                            buttonText={t('clear')}
                            icon={<Trash2 />}
                            onConfirm={clear}
                            confirmMode
                            confirmContent={t('clearConfirm')}
                            variant="destructive"
                        />
                    }
                />
            ) : null}
            <VideoList
                videos={videos}
                emptyState={
                    <VideoListEmptyState
                        icon={<Star className="h-7 w-7 text-muted-foreground" />}
                        title={t('empty')}
                        description={t('emptyHint')}
                        actions={[
                            {
                                label: t('searchCta'),
                                icon: <Search />,
                                onClick: () => setCurrentTab('search'),
                            },
                        ]}
                    />
                }
                renderActions={renderActions}
            />
        </div>
    );
}
