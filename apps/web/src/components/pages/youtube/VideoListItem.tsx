/* eslint-disable @next/next/no-img-element */
'use client';

import { memo, type ReactNode } from 'react';
import { BadgeCheck } from 'lucide-react';

import { cn, formatViewCount } from '@/lib/utils';
import type { YouTubeVideo } from '@/types/youtube.type';

export const VIDEO_LIST_ROW_HEIGHT = 88;
export const VIDEO_LIST_ROW_HEIGHT_EXPANDED = 148;

interface VideoListItemProps {
    video: YouTubeVideo;
    viewsLabel: string;
    isSelected: boolean;
    onSelect?: (video: YouTubeVideo) => void;
    actionSlot?: ReactNode;
}

export const VideoListItem = memo(function VideoListItem({
    video,
    viewsLabel,
    isSelected,
    onSelect,
    actionSlot,
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
                'relative flex w-full cursor-pointer items-start gap-3 rounded-lg p-2 text-left text-sm',
                'hover:bg-accent/50 active:bg-accent/60',
                '[content-visibility:auto] [contain-intrinsic-size:0_88px]',
                isSelected && 'bg-accent/70',
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
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="line-clamp-2 break-words text-sm font-medium leading-snug">
                    {video.title}
                </div>
                <div className="inline-flex items-center text-sm text-muted-foreground">
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
                {isSelected && actionSlot ? (
                    <div className="pt-2">{actionSlot}</div>
                ) : null}
            </div>
        </div>
    );
});
