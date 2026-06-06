'use client';

import { useMemo, useRef } from 'react';
import { Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { hasBrowseFeedSources } from '@vkara/personalization';

import { CuratedPlaylistsPanel } from '@/components/curated-playlists/curated-playlists-panel';
import { useScopedI18n } from '@/locales/client';
import { useBrowseFeed } from '@/hooks/use-browse-feed';
import { useShowCuratedStarters } from '@/hooks/use-curated-starter-visibility';
import { usePersonalizationStore } from '@/store/personalizationStore';
import { useSearchStore } from '@/store/searchStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { VideoSkeletonListForViewport } from '@/components/video-skeleton';

import { cn } from '@/lib/utils';

import { VideoList } from './VideoList';
import { VideoListEmptyState } from './video-list-empty-state';
import { RemotePageGutter, RemoteScrollRoot, RemoteScrollSurface } from './remote-chrome';
import { useVideoSearchListActions } from './use-video-search-list-actions';

type BrowseSuggestionsListProps = {
    className?: string;
};

export function BrowseSuggestionsList({ className }: BrowseSuggestionsListProps) {
    const t = useScopedI18n('videoSearch');
    const renderActions = useVideoSearchListActions();
    const requestSearchOverlay = useSearchStore((state) => state.requestSearchOverlay);
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

    const showCuratedStarters = useShowCuratedStarters(profile, room);
    const hasFeedSources = hasBrowseFeedSources(profile, room);

    const { videos, isLoading, isLoadingMore, hasMore, loadError, loadMore, refresh } =
        useBrowseFeed(profile, room);
    const skeletonScrollRef = useRef<HTMLDivElement>(null);

    if (showCuratedStarters) {
        return (
            <RemoteScrollSurface scrollTopLabel={t('scrollToTop')} className={className}>
                <RemotePageGutter>
                    {!hasFeedSources ? (
                        <VideoListEmptyState
                            icon={<Search className="h-7 w-7 text-muted-foreground" />}
                            title={t('browseEmptyTitle')}
                            description={t('browseEmptyHint')}
                            actions={[
                                {
                                    label: t('browseEmptyCta'),
                                    icon: <Search />,
                                    onClick: requestSearchOverlay,
                                },
                            ]}
                            density="compact"
                        />
                    ) : null}
                    <CuratedPlaylistsPanel variant="browse" />
                </RemotePageGutter>
            </RemoteScrollSurface>
        );
    }

    if (!hasFeedSources) {
        return (
            <RemoteScrollSurface scrollTopLabel={t('scrollToTop')} className={className}>
                <RemotePageGutter>
                    <VideoListEmptyState
                        icon={<Search className="h-7 w-7 text-muted-foreground" />}
                        title={t('browseEmptyTitle')}
                        description={t('browseEmptyHint')}
                        actions={[
                            {
                                label: t('browseEmptyCta'),
                                icon: <Search />,
                                onClick: requestSearchOverlay,
                            },
                        ]}
                        density="compact"
                    />
                </RemotePageGutter>
            </RemoteScrollSurface>
        );
    }

    if (isLoading && videos.length === 0) {
        return (
            <RemoteScrollRoot ref={skeletonScrollRef} className={cn('min-h-0 flex-1', className)}>
                <RemotePageGutter>
                    <VideoSkeletonListForViewport scrollRef={skeletonScrollRef} className="pt-2" />
                </RemotePageGutter>
            </RemoteScrollRoot>
        );
    }

    return (
        <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
            <VideoList
                videos={videos}
                emptyState={
                    <VideoListEmptyState
                        icon={<Search className="h-7 w-7 text-muted-foreground" />}
                        title={t('browseEmptyFeedTitle')}
                        description={t('browseEmptyFeed')}
                        actions={[
                            {
                                label: t('browseEmptyCta'),
                                icon: <Search />,
                                onClick: requestSearchOverlay,
                            },
                        ]}
                    />
                }
                renderActions={renderActions}
                onLoadMore={loadMore}
                hasMore={hasMore}
                isLoading={isLoadingMore}
                loadError={loadError ? t('loadMoreFailed') : null}
                onRefresh={refresh}
            />
        </div>
    );
}
