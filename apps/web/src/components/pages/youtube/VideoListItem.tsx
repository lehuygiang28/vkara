/* eslint-disable @next/next/no-img-element */
'use client';

import { memo } from 'react';
import { BadgeCheck } from 'lucide-react';

import { cn, formatViewCount } from '@/lib/utils';
import type { YouTubeVideo } from '@/types/youtube.type';

export const VIDEO_LIST_ROW_HEIGHT = 88;

interface VideoListItemProps {
    video: YouTubeVideo;
    viewsLabel: string;
    isActive?: boolean;
    onSelect?: (video: YouTubeVideo) => void;
}

export const VideoListItem = memo(function VideoListItem({
    video,
    viewsLabel,
    isActive = false,
    onSelect,
}: VideoListItemProps) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(video)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(video);
                }
            }}
            className={cn(
                'relative flex h-[88px] w-full cursor-pointer items-start gap-3 rounded-lg p-2 text-left text-sm',
                'hover:bg-accent/50 active:bg-accent/60',
                isActive && 'bg-accent/40 ring-1 ring-inset ring-primary/40',
            )}
        >
            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md sm:w-32">
                <img
                    src={video.thumbnail?.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                {video.duration_formatted && (
                    <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs text-white">
                        {video.duration_formatted}
                    </div>
                )}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
                <div className="line-clamp-2 break-words text-sm font-medium leading-snug">
                    {video.title}
                </div>
                <div className="inline-flex max-w-full items-center text-sm text-muted-foreground">
                    <span className="truncate">{video.channel?.name}</span>
                    {video.channel?.verified && (
                        <BadgeCheck className="ml-1 h-4 w-4 shrink-0" />
                    )}
                </div>
                <div className="line-clamp-1 text-xs text-muted-foreground">
                    {video.views > 0 && (
                        <>
                            {formatViewCount(video.views)} {viewsLabel}
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
            </div>
        </div>
    );
});
