'use client';

import { useMemo } from 'react';
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
import { VideoSkeletonList } from '@/components/video-skeleton';

import { VideoList } from './VideoList';
import { VideoListEmptyState } from './video-list-empty-state';
import { RemoteScrollRoot } from './remote-chrome';
import { useVideoSearchListActions } from './use-video-search-list-actions';

export function BrowseSuggestionsList() {
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

    if (showCuratedStarters) {
        return (
            <RemoteScrollRoot className="flex min-h-0 flex-1 flex-col">
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
                        className="flex-none"
                    />
                ) : null}
                <CuratedPlaylistsPanel variant="browse" />
            </RemoteScrollRoot>
        );
    }

    if (!hasFeedSources) {
        return (
            <RemoteScrollRoot className="flex min-h-0 flex-1 flex-col">
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
                    className="flex-none"
                />
            </RemoteScrollRoot>
        );
    }

    if (isLoading && videos.length === 0) {
        return (
            <RemoteScrollRoot className="flex min-h-0 flex-1 flex-col">
                <VideoSkeletonList count={6} className="pt-2" />
            </RemoteScrollRoot>
        );
    }

    return (
        <VideoList
            keyPrefix="browse-suggestions"
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
    );
}
