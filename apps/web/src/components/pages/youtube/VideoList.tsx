'use client';

import { useCallback, useRef, useState, memo, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import type { YouTubeVideo } from '@vkara/youtube';
import { useScopedI18n } from '@/locales/client';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { VideoSkeleton } from '@/components/video-skeleton';
import { ScrollToTopListButton } from '@/components/scroll-to-top-list';
import { VideoListItem, VIDEO_LIST_ROW_HEIGHT, getVideoListRowHeight } from './VideoListItem';
import { VideoListPullHeader } from './video-list-pull-indicator';

const LOADING_ROW_COUNT = 3;
const LOAD_MORE_SENTINEL_HEIGHT = 32;
const LOAD_ERROR_FOOTER_HEIGHT = 72;
const LOADING_ROW_GAP = 12;
const PULL_REFRESH_THRESHOLD = 72;
const PULL_REFRESH_MAX = 96;

export type VideoListActionHelpers = {
    closeMenu: () => void;
};

interface VideoListProps {
    keyPrefix?: string;
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
    const [showScrollTop, setShowScrollTop] = useState(false);
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
    const errorFooterHeight = loadError && !isLoading ? LOAD_ERROR_FOOTER_HEIGHT : 0;
    const loadingFooterHeight = isLoading
        ? LOADING_ROW_COUNT * VIDEO_LIST_ROW_HEIGHT + LOADING_ROW_GAP
        : 0;
    const paddingEnd =
        loadingFooterHeight + errorFooterHeight + (canLoadMore ? LOAD_MORE_SENTINEL_HEIGHT : 0);

    const virtualizer = useVirtualizer({
        count: videos.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: (index) => {
            const video = videos[index];
            return getVideoListRowHeight(Boolean(video && menuVideo?.id === video.id));
        },
        overscan: 4,
        paddingEnd,
        getItemKey: (index) => videos[index]?.id ?? `row-${index}`,
    });

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

    const handleScroll = useCallback(() => {
        const scrollTop = scrollRef.current?.scrollTop ?? 0;
        setShowScrollTop(scrollTop > 200);
    }, []);

    const scrollToTop = useCallback(() => {
        closeMenu();
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        scrollEl.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [closeMenu]);

    const virtualItems = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();
    const contentHeight = totalSize - paddingEnd;
    const actionHelpers: VideoListActionHelpers = { closeMenu };

    return (
        <div className="relative isolate min-h-0 flex-1 overflow-hidden">
            <div
                ref={assignScrollRef}
                onScroll={handleScroll}
                className="relative h-full overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
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
                    emptyState ?? (
                        <div className="flex min-h-[40%] items-center justify-center px-safe-offset py-12 pb-remote-scroll text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    )
                ) : (
                    <div
                        className={cn('relative w-full px-safe-offset pb-2', !onRefresh && 'pt-3')}
                        style={{ height: `${totalSize}px` }}
                    >
                        {virtualItems.map((virtualRow) => {
                            const video = videos[virtualRow.index];
                            if (!video) return null;

                            const isMenuOpen = menuVideo?.id === video.id;

                            return (
                                <div
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    className="absolute left-0 top-0 w-full pb-1"
                                    style={{
                                        transform: `translate3d(0, ${virtualRow.start}px, 0)`,
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
                                className="absolute left-0 w-full space-y-1 px-safe-offset"
                                style={{
                                    transform: `translate3d(0, ${contentHeight}px, 0)`,
                                    height: loadingFooterHeight,
                                }}
                                aria-busy
                                aria-live="polite"
                            >
                                {Array.from({ length: LOADING_ROW_COUNT }, (_, i) => (
                                    <VideoSkeleton key={`loading-row-${i}`} />
                                ))}
                            </div>
                        ) : null}

                        {loadError && !isLoading ? (
                            <div
                                className="absolute left-0 w-full px-safe-offset"
                                style={{
                                    transform: `translate3d(0, ${contentHeight + loadingFooterHeight}px, 0)`,
                                    height: errorFooterHeight,
                                }}
                                role="status"
                                aria-live="polite"
                            >
                                <div className="flex flex-col items-center gap-2 rounded-md border border-[#EAEAEA] bg-[#FDEBEC] px-4 py-3 text-center dark:border-border dark:bg-destructive/10">
                                    <p className="text-sm text-[#9F2F2D] dark:text-destructive">
                                        {loadError}
                                    </p>
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

                <div
                    className={cn(!isLoading && videos.length > 0 && 'shrink-0 pb-remote-scroll')}
                />
            </div>

            <ScrollToTopListButton
                show={showScrollTop && !menuVideo}
                onClick={scrollToTop}
                label={t('scrollToTop')}
            />
        </div>
    );
});

export default VideoList;
