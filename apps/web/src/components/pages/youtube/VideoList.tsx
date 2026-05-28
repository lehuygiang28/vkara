/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, memo, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn, formatViewCount } from '@/lib/utils';
import type { YouTubeVideo } from '@/types/youtube.type';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/locales/client';
import { VideoSkeleton } from '@/components/video-skeleton';
import { ScrollToTopListButton } from '@/components/scroll-to-top-list';

interface VideoListProps {
    keyPrefix?: string;
    videos: YouTubeVideo[];
    emptyMessage: string;
    renderButtons: (video: YouTubeVideo) => React.ReactNode;
    onVideoClick?: (video: YouTubeVideo) => void;
    selectedVideoId?: string | null;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

export const VideoList = memo(function VideoList({
    keyPrefix = 'video-list',
    videos = [],
    emptyMessage,
    renderButtons,
    onVideoClick,
    selectedVideoId,
    onLoadMore,
    hasMore = false,
    isLoading = false,
}: VideoListProps) {
    const t = useI18n();
    const observerTarget = useRef<HTMLDivElement | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        const currentObserverTarget = observerTarget.current;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    onLoadMore?.();
                }
            },
            { threshold: 0.5 },
        );

        if (currentObserverTarget) {
            observer.observe(currentObserverTarget);
        }

        return () => {
            if (currentObserverTarget) {
                observer.unobserve(currentObserverTarget);
            }
        };
    }, [onLoadMore, hasMore]);

    // Scroll to top of list button visibility
    useEffect(() => {
        const scrollArea = scrollAreaRef.current?.querySelector(
            '[data-radix-scroll-area-viewport]',
        );
        if (!scrollArea) return;

        const handleScroll = () => {
            setIsScrolling(true);
            setShowScrollTop(scrollArea.scrollTop > 200);

            // Clear existing timeout
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }

            // Set new timeout
            scrollTimeout.current = setTimeout(() => {
                setIsScrolling(false);
            }, 150);
        };

        scrollArea.addEventListener('scroll', handleScroll);
        return () => {
            scrollArea.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, []);

    // Smooth scroll to top with animation
    const scrollToTop = () => {
        const scrollArea = scrollAreaRef.current?.querySelector(
            '[data-radix-scroll-area-viewport]',
        );
        if (scrollArea) {
            const start = scrollArea.scrollTop;
            const change = -start;
            const duration = 600;
            let startTime: number;

            function easeInOutCubic(t: number): number {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }

            function animate(currentTime: number) {
                if (!startTime) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const progress = Math.min(timeElapsed / duration, 1);
                const easedProgress = easeInOutCubic(progress);

                if (scrollArea) {
                    scrollArea.scrollTop = start + change * easedProgress;
                }
                if (timeElapsed < duration) {
                    requestAnimationFrame(animate);
                }
            }

            requestAnimationFrame(animate);
        }
    };

    return (
        <div className="flex-1 overflow-hidden relative">
            <ScrollArea ref={scrollAreaRef} className="h-full" hideScrollbar>
                <div className={cn('space-y-3 px-1', !isLoading && 'pb-[20rem]')}>
                    <ScrollToTopListButton
                        show={showScrollTop && !isScrolling}
                        onClick={scrollToTop}
                    />
                    <AnimatePresence mode="popLayout" initial={false}>
                        {videos.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex items-center justify-center py-8 text-sm text-muted-foreground"
                            >
                                {emptyMessage}
                            </motion.div>
                        ) : (
                            videos.map((video) => (
                                <motion.div
                                    key={`${keyPrefix}-${video.id}`}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{
                                        duration: 0.3,
                                        ease: 'easeOut',
                                        layout: { duration: 0.2 },
                                    }}
                                    onClick={() => onVideoClick?.(video)}
                                    className={cn(
                                        'flex w-full items-start gap-3 p-4 text-left text-sm relative rounded-lg',
                                        'hover:bg-accent/50 cursor-pointer',
                                        'sm:items-center',
                                        selectedVideoId === video.id && 'bg-accent',
                                    )}
                                >
                                    <motion.div
                                        layout
                                        className="relative aspect-video w-24 sm:w-32 flex-shrink-0 overflow-hidden rounded-md"
                                    >
                                        <img
                                            src={video.thumbnail?.url}
                                            alt={video.title}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                        {video.duration_formatted && (
                                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                                                {video.duration_formatted}
                                            </div>
                                        )}
                                    </motion.div>
                                    <motion.div
                                        layout
                                        className="flex-col w-0 flex-1 overflow-hidden"
                                    >
                                        <div className="text-md font-medium leading-snug line-clamp-2 break-words">
                                            {video.title}
                                        </div>
                                        <div className="text-sm text-muted-foreground inline-flex items-center align-middle line-clamp-1">
                                            <span className="truncate">{video.channel?.name}</span>
                                            {video.channel?.verified && (
                                                <BadgeCheck className="ml-1 h-4 w-4 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                            {video.views > 0 && (
                                                <>
                                                    {formatViewCount(video.views)}{' '}
                                                    {t('videoSearch.views')}
                                                    {video.uploadedAt && ' • '}
                                                </>
                                            )}
                                            {video.uploadedAt && (
                                                <>
                                                    {video.views > 0 ? '' : '• '}
                                                    {video.uploadedAt}
                                                </>
                                            )}
                                        </div>
                                        <motion.div
                                            initial={false}
                                            animate={{
                                                height: selectedVideoId === video.id ? 'auto' : 0,
                                                opacity: selectedVideoId === video.id ? 1 : 0,
                                                marginTop: selectedVideoId === video.id ? 8 : 0,
                                            }}
                                            transition={{
                                                duration: 0.2,
                                                ease: 'easeInOut',
                                            }}
                                            className="overflow-hidden"
                                        >
                                            {renderButtons(video)}
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                    {isLoading && (
                        <div className="space-y-4 p-4">
                            {[...Array(4)].map((_, i) => (
                                <VideoSkeleton key={i} />
                            ))}
                        </div>
                    )}
                    {hasMore && (
                        <div ref={observerTarget} className="flex w-full items-start gap-3" />
                    )}
                </div>
            </ScrollArea>
        </div>
    );
});

export default VideoList;
