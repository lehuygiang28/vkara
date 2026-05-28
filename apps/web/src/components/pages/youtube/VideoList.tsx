'use client';

import { useCallback, useEffect, useRef, memo, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@/lib/utils';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useScopedI18n } from '@/locales/client';
import { VideoSkeleton } from '@/components/video-skeleton';
import { ScrollToTopListButton } from '@/components/scroll-to-top-list';
import {
    VideoListItem,
    VIDEO_LIST_ROW_HEIGHT,
    VIDEO_LIST_ROW_HEIGHT_EXPANDED,
} from './VideoListItem';

interface VideoListProps {
    keyPrefix?: string;
    videos: YouTubeVideo[];
    emptyMessage: string;
    renderButtons: (video: YouTubeVideo) => ReactNode;
    onVideoClick?: (video: YouTubeVideo) => void;
    selectedVideoId?: string | null;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

export const VideoList = memo(function VideoList({
    videos = [],
    emptyMessage,
    renderButtons,
    onVideoClick,
    selectedVideoId,
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

    const getRowHeight = useCallback(
        (index: number) => {
            const video = videos[index];
            if (video && selectedVideoId === video.id) {
                return VIDEO_LIST_ROW_HEIGHT_EXPANDED;
            }
            return VIDEO_LIST_ROW_HEIGHT;
        },
        [videos, selectedVideoId],
    );

    const virtualizer = useVirtualizer({
        count: videos.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: getRowHeight,
        overscan: 6,
        getItemKey: (index) => videos[index]?.id ?? index,
    });

    useEffect(() => {
        virtualizer.measure();
    }, [selectedVideoId, videos.length, virtualizer]);

    useEffect(() => {
        const root = scrollRef.current;
        const target = observerTarget.current;
        if (!root || !target || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting || loadMoreLockRef.current) return;
                loadMoreLockRef.current = true;
                onLoadMore?.();
            },
            { root, rootMargin: '120px', threshold: 0 },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, onLoadMore, videos.length]);

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
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const virtualItems = virtualizer.getVirtualItems();

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
                        style={{ height: `${virtualizer.getTotalSize()}px` }}
                    >
                        {virtualItems.map((virtualRow) => {
                            const video = videos[virtualRow.index];
                            if (!video) return null;
                            const isSelected = selectedVideoId === video.id;

                            return (
                                <div
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    ref={virtualizer.measureElement}
                                    className="absolute left-0 top-0 w-full pb-1"
                                    style={{
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <VideoListItem
                                        video={video}
                                        viewsLabel={viewsLabel}
                                        isSelected={isSelected}
                                        onSelect={onVideoClick}
                                        actionSlot={
                                            isSelected ? renderButtons(video) : undefined
                                        }
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {isLoading && (
                    <div className="space-y-1 px-safe-offset pb-4">
                        {[0, 1, 2].map((i) => (
                            <VideoSkeleton key={`loading-more-${i}`} />
                        ))}
                    </div>
                )}

                {hasMore && videos.length > 0 && (
                    <div ref={observerTarget} className="h-8 w-full shrink-0" aria-hidden />
                )}

                <div className={cn(!isLoading && videos.length > 0 && 'shrink-0 pb-remote-scroll')} />
            </div>

            <ScrollToTopListButton show={showScrollTop} onClick={scrollToTop} />
        </div>
    );
});

export default VideoList;
