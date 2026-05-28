'use client';

import { useCallback, useEffect } from 'react';
import { ListVideo, MoveUp, Play } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useSearchStore } from '@/store/searchStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoSkeletonList } from '@/components/video-skeleton';
import { VideoList, type VideoListActionHelpers } from './VideoList';
import { VideoListActionBar } from './video-list-action-bar';

type RelatedVideoListProps = {
    keyPrefix?: string;
};

function useRelatedSourceVideoId(): string | undefined {
    const playingNowId = useYouTubeStore((s) => s.room?.playingNow?.id);
    const historyId = useYouTubeStore((s) => s.room?.historyQueue[0]?.id);
    return playingNowId ?? historyId;
}

export function RelatedVideoList({ keyPrefix = 'related-list' }: RelatedVideoListProps) {
    const t = useScopedI18n('videoSearch');
    const sourceVideoId = useRelatedSourceVideoId();

    const {
        isRelatedLoading,
        isRelatedLoadingMore,
        relatedResults,
        relatedNextToken,
        fetchRelatedResults,
        loadMoreRelated,
    } = useSearchStore(
        useShallow((state) => ({
            isRelatedLoading: state.isRelatedLoading,
            isRelatedLoadingMore: state.isRelatedLoadingMore,
            relatedResults: state.relatedResults,
            relatedNextToken: state.relatedNextToken,
            fetchRelatedResults: state.fetchRelatedResults,
            loadMoreRelated: state.loadMoreRelated,
        })),
    );

    const { handlePlayVideoNow, handleAddVideoToQueue, handleAddVideoAndMoveToTop } =
        usePlayerAction();

    useEffect(() => {
        if (sourceVideoId) {
            void fetchRelatedResults(sourceVideoId);
        }
    }, [sourceVideoId, fetchRelatedResults]);

    const handleLoadMore = useCallback(() => {
        if (relatedNextToken && !isRelatedLoadingMore && sourceVideoId) {
            void loadMoreRelated();
        }
    }, [relatedNextToken, isRelatedLoadingMore, sourceVideoId, loadMoreRelated]);

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
                        label: t('addVideoAndMoveToTop'),
                        buttonText: t('addVideoAndMoveToTop'),
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

    if (!sourceVideoId) {
        return null;
    }

    if (isRelatedLoading && relatedResults.length === 0) {
        return <VideoSkeletonList count={6} className="pb-remote-scroll pt-2" />;
    }

    return (
        <VideoList
            keyPrefix={keyPrefix}
            videos={relatedResults}
            emptyMessage={relatedResults.length === 0 ? t('noResults') : ''}
            renderActions={renderActions}
            onLoadMore={handleLoadMore}
            hasMore={Boolean(relatedNextToken)}
            isLoading={isRelatedLoadingMore}
        />
    );
}

export function useHasRelatedFeed(): boolean {
    const sourceVideoId = useRelatedSourceVideoId();
    return Boolean(sourceVideoId);
}
