'use client';

import { useMemo, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { hasBrowseFeedSources } from '@vkara/shared-utils';

import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useBrowseFeed } from '@/hooks/use-browse-feed';
import { usePersonalizationStore } from '@/store/personalizationStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { VideoSkeletonList } from '@/components/video-skeleton';

import { VideoList, type VideoListActionHelpers } from './VideoList';

type BrowseSuggestionsListProps = {
    renderActions: (video: YouTubeVideo, helpers: VideoListActionHelpers) => ReactNode;
};

export function BrowseSuggestionsList({ renderActions }: BrowseSuggestionsListProps) {
    const t = useScopedI18n('videoSearch');
    const { searchHistory, channelScores, recentVideos } = usePersonalizationStore(
        useShallow((state) => ({
            searchHistory: state.searchHistory,
            channelScores: state.channelScores,
            recentVideos: state.recentVideos,
        })),
    );
    const playingNow = useYouTubeStore((state) => state.room?.playingNow ?? null);
    const historyQueue = useYouTubeStore((state) => state.room?.historyQueue ?? []);

    const profile = useMemo(
        () => ({
            searchHistory,
            channelScores,
            recentVideos: recentVideos.map((video) => ({
                id: video.id,
                title: video.title,
                channels: video.channels,
            })),
        }),
        [searchHistory, channelScores, recentVideos],
    );

    const room = useMemo(
        () => ({
            playingNow: playingNow
                ? {
                      id: playingNow.id,
                      title: playingNow.title,
                      channels: playingNow.channels,
                  }
                : null,
            historyQueue: historyQueue.map((video) => ({
                id: video.id,
                title: video.title,
                channels: video.channels,
            })),
        }),
        [playingNow, historyQueue],
    );

    const { videos, isLoading, isLoadingMore, hasMore, loadMore } = useBrowseFeed(profile, room);

    if (!hasBrowseFeedSources(profile, room)) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center px-safe-offset pb-remote-scroll pt-4 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                    <Search className="h-7 w-7 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-base font-medium text-foreground">{t('browseEmptyTitle')}</p>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">{t('browseEmptyHint')}</p>
            </div>
        );
    }

    if (isLoading && videos.length === 0) {
        return <VideoSkeletonList count={6} className="pb-remote-scroll pt-2" />;
    }

    return (
        <VideoList
            keyPrefix="browse-suggestions"
            videos={videos}
            emptyMessage={videos.length === 0 ? t('browseEmptyFeed') : ''}
            renderActions={renderActions}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
        />
    );
}
