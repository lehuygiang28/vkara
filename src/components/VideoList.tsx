/* eslint-disable @next/next/no-img-element */
import React, { memo } from 'react';

import { cn } from '@/lib/utils';
import { YouTubeVideo } from '@/types/youtube.type';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    return (
        <div className="flex-1 overflow-hidden">
            {/* Scrollable Container */}
            <ScrollArea className="h-full">
                <div className="space-y-3 pb-[12rem]">
                    {videos.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        videos.map((video, index) => (
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
                                    {index !== undefined && (
                                        <div className="absolute top-0 left-0 bg-background/80 backdrop-blur-sm px-2 py-1 text-xs font-medium">
                                            #{index + 1}
                                        </div>
                                    )}
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
                                    <div className="text-xs text-muted-foreground truncate">
                                        {video.channel?.name}
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
