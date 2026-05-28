'use client';

import { useEffect, useRef, memo, useState, useCallback, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@/lib/utils';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useScopedI18n } from '@/locales/client';
import { VideoSkeleton } from '@/components/video-skeleton';
import { ScrollToTopListButton } from '@/components/scroll-to-top-list';
import { VideoListItem, VIDEO_LIST_ROW_HEIGHT } from './VideoListItem';
import { VideoListActionPopover } from './VideoListActionPopover';

const LOADING_ROW_COUNT = 3;
const LOAD_MORE_SENTINEL_HEIGHT = 32;
const LOADING_ROW_GAP = 12;

export type VideoListActionHelpers = {
    closeMenu: () => void;
};

interface VideoListProps {
    keyPrefix?: string;
    videos: YouTubeVideo[];
    emptyMessage: string;
    renderActions: (video: YouTubeVideo, helpers: VideoListActionHelpers) => ReactNode;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

export const VideoList = memo(function VideoList({
    videos = [],
    emptyMessage,
    renderActions,
    onLoadMore,
    hasMore = false,
    isLoading = false,
}: VideoListProps) {
    const t = useScopedI18n('videoSearch');
    const viewsLabel = t('views');

    const scrollRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const showScrollTopRef = useRef(false);
    const loadMoreLockRef = useRef(false);
    const [menuVideo, setMenuVideo] = useState<YouTubeVideo | null>(null);
    const menuVideoRef = useRef<YouTubeVideo | null>(null);
    menuVideoRef.current = menuVideo;

    const closeMenu = useCallback(() => setMenuVideo(null), []);

    const loadingFooterHeight = isLoading
        ? LOADING_ROW_COUNT * VIDEO_LIST_ROW_HEIGHT + LOADING_ROW_GAP
        : 0;
    const paddingEnd = loadingFooterHeight + (hasMore ? LOAD_MORE_SENTINEL_HEIGHT : 0);

    const virtualizer = useVirtualizer({
        count: videos.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => VIDEO_LIST_ROW_HEIGHT,
        overscan: 4,
        paddingEnd,
        getItemKey: (index) => videos[index]?.id ?? `row-${index}`,
    });

    const handleRowPress = useCallback((video: YouTubeVideo) => {
        setMenuVideo((current) => (current?.id === video.id ? null : video));
    }, []);

    useEffect(() => {
        const root = scrollRef.current;
        const target = observerTarget.current;
        if (!root || !target || !hasMore || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting || loadMoreLockRef.current) return;
                loadMoreLockRef.current = true;
                onLoadMore?.();
            },
            { root, rootMargin: '160px', threshold: 0 },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, isLoading, onLoadMore, videos.length]);

    useEffect(() => {
        if (!isLoading) {
            loadMoreLockRef.current = false;
        }
    }, [isLoading]);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        let rafId = 0;
        const onScroll = () => {
            if (menuVideoRef.current) {
                setMenuVideo(null);
            }

            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                const shouldShow = scrollEl.scrollTop > 200;
                if (shouldShow !== showScrollTopRef.current) {
                    showScrollTopRef.current = shouldShow;
                    setShowScrollTop(shouldShow);
                }
            });
        };

        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            scrollEl.removeEventListener('scroll', onScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    const scrollToTop = () => {
        closeMenu();
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const virtualItems = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();
    const contentHeight = totalSize - paddingEnd;
    const actionHelpers: VideoListActionHelpers = { closeMenu };

    return (
        <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
                ref={scrollRef}
                className="h-full overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
            >
                {videos.length === 0 ? (
                    <div className="flex min-h-[40%] items-center justify-center px-safe-offset py-12 pb-remote-scroll text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </div>
                ) : (
                    <div
                        className="relative w-full px-safe-offset pb-2 pt-3"
                        style={{ height: `${totalSize}px` }}
                    >
                        {virtualItems.map((virtualRow) => {
                            const video = videos[virtualRow.index];
                            if (!video) return null;

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
                                        isActive={menuVideo?.id === video.id}
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

                        {hasMore ? (
                            <div
                                ref={observerTarget}
                                className="absolute left-0 h-8 w-full"
                                style={{
                                    transform: `translate3d(0, ${contentHeight + loadingFooterHeight}px, 0)`,
                                }}
                                aria-hidden
                            />
                        ) : null}
                    </div>
                )}

                <div className={cn(!isLoading && videos.length > 0 && 'shrink-0 pb-remote-scroll')} />
            </div>

            {menuVideo ? (
                <VideoListActionPopover video={menuVideo} onClose={closeMenu}>
                    {renderActions(menuVideo, actionHelpers)}
                </VideoListActionPopover>
            ) : null}

            <ScrollToTopListButton show={showScrollTop} onClick={scrollToTop} />
        </div>
    );
});

export default VideoList;
