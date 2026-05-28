'use client';

import React, { useEffect } from 'react';
import { Play, ListVideo, MoveUp } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useSearchStore } from '@/store/searchStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoSkeletonList } from '@/components/video-skeleton';
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
            <div className="flex flex-wrap items-center gap-2">
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
        );
    }

    const handleLoadMore = () => {
        if (relatedNextToken && !isRelatedLoadingMore) {
            loadMoreRelated();
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            {isRelatedLoading && (relatedResults?.length || 0) <= 0 ? (
                <VideoSkeletonList count={6} className="pb-28" />
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
