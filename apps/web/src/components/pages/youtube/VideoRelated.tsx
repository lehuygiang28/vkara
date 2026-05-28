'use client';

import React, { useEffect } from 'react';
import { Play, ListVideo, MoveUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useSearchStore } from '@/store/searchStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoSkeleton } from '@/components/video-skeleton';
import { TooltipButton } from '@/components/tooltip-button';
import { VideoList } from './VideoList';
import { useYouTubeStore } from '@/store/youtubeStore';

export function VideoRelated() {
    const t = useScopedI18n('videoSearch');

    const { room } = useYouTubeStore();
    const {
        isRelatedLoading,
        isRelatedLoadingMore,
        relatedResults,
        relatedNextToken,
        selectedRelatedVideoId,
        setSelectedRelatedVideoId,
        fetchRelatedResults,
        loadMoreRelated,
    } = useSearchStore();
    const { handlePlayVideoNow, handleAddVideoToQueue, handleAddVideoAndMoveToTop } =
        usePlayerAction();

    useEffect(() => {
        if (room?.playingNow?.id) {
            fetchRelatedResults(room.playingNow.id);
        }
    }, [room?.playingNow?.id, fetchRelatedResults]);

    function renderButtons(video: YouTubeVideo) {
        return (
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    selectedRelatedVideoId === video.id
                        ? 'max-h-40 opacity-100'
                        : 'max-h-0 opacity-0',
                )}
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <TooltipButton
                        buttonText={t('playNow')}
                        tooltipContent={t('playNow')}
                        icon={<Play className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => {
                            setSelectedRelatedVideoId(null);
                            handlePlayVideoNow(video);
                        }}
                        variant={'outline'}
                    />

                    <TooltipButton
                        buttonText={t('addToQueue')}
                        tooltipContent={t('addToQueue')}
                        icon={<ListVideo className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => {
                            setSelectedRelatedVideoId(null);
                            handleAddVideoToQueue(video);
                        }}
                    />

                    <TooltipButton
                        buttonText={t('addVideoAndMoveToTop')}
                        tooltipContent={t('addVideoAndMoveToTop')}
                        icon={<MoveUp className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => {
                            setSelectedRelatedVideoId(null);
                            handleAddVideoAndMoveToTop(video);
                        }}
                    />
                </div>
            </div>
        );
    }

    const handleLoadMore = () => {
        if (relatedNextToken && !isRelatedLoadingMore) {
            loadMoreRelated();
        }
    };

    return (
        <div className="flex flex-col h-screen">
            {isRelatedLoading && (relatedResults?.length || 0) <= 0 ? (
                <div className="space-y-4 p-4">
                    {[...Array(8)].map((_, i) => (
                        <VideoSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <>
                    <VideoList
                        keyPrefix={'related-list'}
                        videos={relatedResults}
                        emptyMessage={relatedResults.length === 0 ? t('noResults') : ''}
                        renderButtons={renderButtons}
                        onVideoClick={(video) =>
                            setSelectedRelatedVideoId(
                                video.id === selectedRelatedVideoId ? null : video.id,
                            )
                        }
                        selectedVideoId={selectedRelatedVideoId}
                        onLoadMore={handleLoadMore}
                        hasMore={!!relatedNextToken}
                        isLoading={isRelatedLoadingMore}
                    />
                </>
            )}
        </div>
    );
}
