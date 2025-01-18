/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useRef, memo } from 'react';
import { BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn, formatViewCount } from '@/lib/utils';
import { YouTubeVideo } from '@/types/youtube.type';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/locales/client';

interface VideoListProps {
    keyPrefix?: string;
    videos: YouTubeVideo[];
    emptyMessage: string;
    renderButtons: (video: YouTubeVideo) => React.ReactNode;
    onVideoClick?: (video: YouTubeVideo) => void;
    selectedVideoId?: string | null;
    onLoadMore?: () => void;
    hasMore?: boolean;
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
}: VideoListProps) {
    const t = useI18n();
    const observerTarget = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    onLoadMore?.();
                }
            },
            { threshold: 0.5 },
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [onLoadMore, hasMore]);

    return (
        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" hideScrollbar>
                <div className="space-y-3 pb-[20rem]">
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
                                    <motion.div layout className="flex flex-col min-w-0">
                                        <div className="text-md font-medium leading-snug line-clamp-2">
                                            {video.title}
                                        </div>
                                        <div className="text-sm text-muted-foreground inline-flex items-center align-middle line-clamp-1">
                                            {video.channel?.name}
                                            {video.channel?.verified && (
                                                <BadgeCheck className="ml-1 h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                            {formatViewCount(video.views)} {t('videoSearch.views')}
                                            {video.uploadedAt && <> • {video.uploadedAt}</>}
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
                                        >
                                            {renderButtons(video)}
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                    {hasMore && (
                        <div ref={observerTarget} className="flex w-full items-start gap-3" />
                    )}
                </div>
            </ScrollArea>
        </div>
    );
});

export default VideoList;
