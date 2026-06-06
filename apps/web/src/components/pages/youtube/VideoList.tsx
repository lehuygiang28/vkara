'use client';

import { useCallback, useRef, useState, memo, useLayoutEffect, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { YouTubeVideo } from '@vkara/youtube';

import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import {
    getVideoListStackHeight,
    useVideoListSkeletonRows,
} from '@/hooks/use-video-list-skeleton-rows';
import { VIDEO_LIST_ROW_GAP, VIDEO_LIST_SKELETON_LOAD_MORE_ROWS } from '@/lib/video-list-layout';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { VideoSkeleton } from '@/components/video-skeleton';

import { VideoListItem, getVideoListRowHeight } from './VideoListItem';
import { VideoListPullHeader } from './video-list-pull-indicator';
import { RemotePageGutter, RemoteScrollSurface } from './remote-chrome';

const LOAD_MORE_SENTINEL_HEIGHT = 32;
const LOAD_ERROR_FOOTER_HEIGHT = 72;
const PULL_REFRESH_THRESHOLD = 72;
const PULL_REFRESH_MAX = 96;

export type VideoListActionHelpers = {
    closeMenu: () => void;
};

interface VideoListProps {
    videos: YouTubeVideo[];
    emptyMessage?: string;
    emptyState?: ReactNode;
    renderActions: (video: YouTubeVideo, helpers: VideoListActionHelpers) => ReactNode;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
    loadError?: string | null;
    onRefresh?: () => void | Promise<void>;
}

export const VideoList = memo(function VideoList({
    videos = [],
    emptyMessage = '',
    emptyState,
    renderActions,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    loadError = null,
    onRefresh,
}: VideoListProps) {
    const t = useScopedI18n('videoSearch');
    const viewsLabel = t('views');

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [scrollReady, setScrollReady] = useState(false);
    const [menuVideo, setMenuVideo] = useState<YouTubeVideo | null>(null);

    const assignScrollRef = useCallback((node: HTMLDivElement | null) => {
        scrollRef.current = node;
        setScrollReady(node !== null);
    }, []);

    const closeMenu = useCallback(() => setMenuVideo(null), []);

    const handleRefresh = useCallback(async () => {
        if (!onRefresh) return;
        await Promise.resolve(onRefresh());
    }, [onRefresh]);

    const { isRefreshing, pullPosition } = usePullToRefresh({
        onRefresh: handleRefresh,
        elementRef: scrollRef,
        refreshThreshold: PULL_REFRESH_THRESHOLD,
        maximumPullLength: PULL_REFRESH_MAX,
        enableResistance: true,
        isDisabled: !scrollReady || !onRefresh || isLoading || videos.length === 0,
    });

    const canLoadMore = hasMore || Boolean(loadError);
    const loadingRowCount = useVideoListSkeletonRows(scrollRef, isLoading, {
        viewportFraction: 0.5,
        minRows: 2,
        fallback: VIDEO_LIST_SKELETON_LOAD_MORE_ROWS,
        observe: false,
    });
    const loadingBlockHeight = getVideoListStackHeight(loadingRowCount);
    const loadingFooterHeightRef = useRef(0);
    if (isLoading) {
        loadingFooterHeightRef.current = loadingBlockHeight;
    }
    const errorFooterHeight = loadError && !isLoading ? LOAD_ERROR_FOOTER_HEIGHT : 0;
    const loadingFooterHeight = isLoading ? loadingFooterHeightRef.current : 0;
    const paddingEnd =
        loadingFooterHeight + errorFooterHeight + (canLoadMore ? LOAD_MORE_SENTINEL_HEIGHT : 0);

    const estimateSize = useCallback(
        (index: number) => {
            const video = videos[index];
            return getVideoListRowHeight(Boolean(video && menuVideo?.id === video.id));
        },
        [videos, menuVideo?.id],
    );

    const getItemKey = useCallback(
        (index: number) => videos[index]?.id ?? `row-${index}`,
        [videos],
    );

    const virtualizer = useVirtualizer({
        count: videos.length,
        getScrollElement: () => scrollRef.current,
        estimateSize,
        overscan: 4,
        paddingEnd,
        getItemKey,
        gap: VIDEO_LIST_ROW_GAP,
    });

    const measureVirtualizerRef = useRef(virtualizer.measure);
    measureVirtualizerRef.current = virtualizer.measure;

    // estimateSize depends on menuVideo but Virtualizer memo does not — remeasure when selection changes.
    useLayoutEffect(() => {
        if (videos.length === 0) return;
        measureVirtualizerRef.current();
    }, [menuVideo?.id, videos.length]);

    useInfiniteScrollSentinel({
        rootRef: scrollRef,
        sentinelRef,
        enabled: canLoadMore,
        isLoading,
        onLoadMoreAction: onLoadMore,
    });

    const handleRowPress = useCallback((video: YouTubeVideo) => {
        setMenuVideo((current) => (current?.id === video.id ? null : video));
    }, []);

    const virtualItems = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();
    const contentHeight = totalSize - paddingEnd;
    const actionHelpers: VideoListActionHelpers = { closeMenu };

    return (
        <RemoteScrollSurface
            scrollTopLabel={t('scrollToTop')}
            showScrollTopButton={!menuVideo}
            onBeforeScrollToTop={closeMenu}
            onScrollRef={assignScrollRef}
            scrollRootClassName="relative h-full"
        >
            <RemotePageGutter
                className={cn(videos.length === 0 ? undefined : cn('pb-2', !onRefresh && 'pt-3'))}
            >
                {onRefresh ? (
                    <VideoListPullHeader
                        pullPosition={pullPosition}
                        isRefreshing={isRefreshing}
                        holdGap={PULL_REFRESH_THRESHOLD}
                        refreshThreshold={PULL_REFRESH_THRESHOLD}
                        maxPullGap={PULL_REFRESH_MAX}
                    />
                ) : null}

                {videos.length === 0 ? (
                    (emptyState ?? (
                        <div className="flex min-h-[40%] items-center justify-center py-12 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ))
                ) : (
                    <div className="relative w-full" style={{ height: `${totalSize}px` }}>
                        {virtualItems.map((virtualRow) => {
                            const video = videos[virtualRow.index];
                            if (!video) return null;

                            const isMenuOpen = menuVideo?.id === video.id;
                            const rowHeight = getVideoListRowHeight(isMenuOpen);

                            return (
                                <div
                                    key={virtualRow.key}
                                    ref={virtualizer.measureElement}
                                    data-index={virtualRow.index}
                                    className={cn(
                                        'absolute left-0 top-0 w-full',
                                        isMenuOpen && 'z-10',
                                    )}
                                    style={{
                                        transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                                        contentVisibility: 'auto',
                                        containIntrinsicSize: `${rowHeight}px`,
                                    }}
                                >
                                    <VideoListItem
                                        video={video}
                                        viewsLabel={viewsLabel}
                                        isActive={isMenuOpen}
                                        actions={
                                            isMenuOpen
                                                ? renderActions(video, actionHelpers)
                                                : undefined
                                        }
                                        onSelect={handleRowPress}
                                    />
                                </div>
                            );
                        })}

                        {isLoading ? (
                            <div
                                className="absolute left-0 w-full space-y-1"
                                style={{
                                    transform: `translate3d(0, ${contentHeight}px, 0)`,
                                    height: loadingFooterHeight,
                                }}
                                aria-busy
                                aria-live="polite"
                            >
                                {Array.from({ length: loadingRowCount }, (_, i) => (
                                    <VideoSkeleton key={`loading-row-${i}`} />
                                ))}
                            </div>
                        ) : null}

                        {loadError && !isLoading ? (
                            <div
                                className="absolute left-0 w-full"
                                style={{
                                    transform: `translate3d(0, ${contentHeight + loadingFooterHeight}px, 0)`,
                                    height: errorFooterHeight,
                                }}
                                role="status"
                                aria-live="polite"
                            >
                                <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-destructive/10 px-4 py-3 text-center">
                                    <p className="text-sm text-destructive">{loadError}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('loadMoreRetryHint')}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {canLoadMore ? (
                            <div
                                ref={sentinelRef}
                                className="absolute left-0 h-8 w-full"
                                style={{
                                    transform: `translate3d(0, ${contentHeight + loadingFooterHeight + errorFooterHeight}px, 0)`,
                                }}
                                aria-hidden
                            />
                        ) : null}
                    </div>
                )}
            </RemotePageGutter>
        </RemoteScrollSurface>
    );
});

export default VideoList;
