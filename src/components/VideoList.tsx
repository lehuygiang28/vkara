/* eslint-disable @next/next/no-img-element */
import React, { memo } from 'react';

import { cn, formatViewCount } from '@/lib/utils';
import { YouTubeVideo } from '@/types/youtube.type';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/locales/client';

interface VideoListProps {
    videos: YouTubeVideo[];
    emptyMessage: string;
    renderButtons: (video: YouTubeVideo) => React.ReactNode;
    onVideoClick?: (video: YouTubeVideo) => void;
    selectedVideoId?: string | null;
}

export const VideoList = memo(function VideoList({
    videos,
    emptyMessage,
    renderButtons,
    onVideoClick,
    selectedVideoId,
}: VideoListProps) {
    const t = useI18n();

    return (
        <div className="flex-1 overflow-hidden">
            {/* Scrollable Container */}
            <ScrollArea className="h-full" hideScrollbar>
                <div className="space-y-3 pb-[20rem]">
                    {videos.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        videos.map((video) => (
                            <div
                                key={video.id}
                                onClick={() => onVideoClick?.(video)}
                                className={cn(
                                    'flex w-full items-start gap-3 p-4 text-left text-sm transition-all relative rounded-lg',
                                    'hover:bg-accent/50 cursor-pointer',
                                    'sm:items-center',
                                    selectedVideoId === video.id && 'bg-accent',
                                )}
                            >
                                <div className="relative aspect-video w-24 sm:w-32 flex-shrink-0 overflow-hidden rounded-md">
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
                                </div>
                                <div className="flex flex-col flex-grow min-w-0">
                                    <div className="font-medium leading-snug mb-1 line-clamp-2">
                                        {video.title}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate">
                                        {video.channel?.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatViewCount(video.views)} {t('videoSearch.views')} •{' '}
                                        {video.uploadedAt}
                                    </div>
                                    {renderButtons(video)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
});

export default VideoList;
