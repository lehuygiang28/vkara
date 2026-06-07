'use client';

import { useCallback } from 'react';
import { Play, ListVideo, MoveUp, X, Search, History } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@vkara/youtube';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/tooltip-button';
import { VideoList, type VideoListActionHelpers } from './VideoList';
import { VideoListActionBar } from './video-list-action-bar';
import { VideoListToolbar } from './video-list-toolbar';
import { VideoListEmptyState } from './video-list-empty-state';

export function VideoHistory() {
    const {
        handlePlayVideoNow,
        handleAddVideoToQueue,
        handleAddVideoAndMoveToTop,
        handleClearHistory,
    } = usePlayerAction();
    const { room, setCurrentTab } = useYouTubeStore();
    const t = useScopedI18n('videoHistory');

    const renderActions = useCallback(
        (video: YouTubeVideo, { closeMenu }: VideoListActionHelpers) => (
            <VideoListActionBar
                actions={[
                    {
                        id: 'play',
                        label: t('playNow'),
                        buttonText: t('playNowShort'),
                        icon: <Play />,
                        tone: 'success',
                        onClick: () => {
                            closeMenu();
                            handlePlayVideoNow(video);
                        },
                    },
                    {
                        id: 'queue',
                        label: t('addToQueue'),
                        buttonText: t('addToQueueShort'),
                        icon: <ListVideo />,
                        tone: 'default',
                        onClick: () => {
                            closeMenu();
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
                            closeMenu();
                            handleAddVideoAndMoveToTop(video);
                        },
                    },
                ]}
            />
        ),
        [t, handlePlayVideoNow, handleAddVideoToQueue, handleAddVideoAndMoveToTop],
    );

    const hasHistory = (room?.historyQueue?.length || 0) > 0;

    return (
        <div className={cn('flex h-full min-h-0 flex-col', !hasHistory && 'pt-safe-offset')}>
            {hasHistory ? (
                <VideoListToolbar
                    trailing={
                        <TooltipButton
                            tooltipContent={t('clearHistory')}
                            buttonText={t('clearHistory')}
                            icon={<X />}
                            onConfirm={handleClearHistory}
                            confirmMode
                            confirmContent={t('clearHistoryConfirm')}
                            variant="destructive"
                        />
                    }
                />
            ) : null}
            <VideoList
                videos={room?.historyQueue || []}
                emptyState={
                    <VideoListEmptyState
                        icon={<History className="h-7 w-7 text-muted-foreground" />}
                        title={t('noHistory')}
                        description={t('noHistoryHint')}
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
