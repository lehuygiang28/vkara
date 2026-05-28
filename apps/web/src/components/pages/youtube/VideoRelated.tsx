'use client';

import React, { useEffect } from 'react';
import { Play, ListVideo, MoveUp } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useSearchStore } from '@/store/searchStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoSkeletonList } from '@/components/video-skeleton';
import { VideoList } from './VideoList';
import { VideoListActionBar } from './video-list-action-bar';
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
            <VideoListActionBar
                actions={[
                    {
                        id: 'play',
                        label: t('playNow'),
                        buttonText: t('playNowShort'),
                        icon: <Play />,
                        tone: 'success',
                        onClick: () => {
                            setSelectedRelatedVideoId(null);
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
                            setSelectedRelatedVideoId(null);
                            handleAddVideoToQueue(video);
                        },
                    },
                    {
                        id: 'priority',
                        label: t('addVideoAndMoveToTop'),
                        buttonText: t('addVideoAndMoveToTop'),
                        icon: <MoveUp />,
                        tone: 'success',
                        onClick: () => {
                            setSelectedRelatedVideoId(null);
                            handleAddVideoAndMoveToTop(video);
                        },
                    },
                ]}
            />
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
