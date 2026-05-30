/* eslint-disable @next/next/no-img-element */
'use client';

import { memo } from 'react';
import { VideoChannels } from '@/components/video-channels';
import { LiveBadge } from '@/components/youtube-live-badge';
import { coerceViewCount, formatViewCount } from '@vkara/shared-utils';
import { formatUploadedAt } from '@/lib/format-uploaded-at';
import { isVideoLive } from '@/lib/youtube-video';
import { cn } from '@/lib/utils';
import { useI18n } from '@/locales/client';
import type { YouTubeVideo } from '@/types/youtube.type';

/** Fits title (2 lines) + channels (2 lines) + views within virtualized rows. */
export const VIDEO_LIST_ROW_HEIGHT = 100;

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
    const t = useI18n();
    const uploadedAtLabel = video.uploadedAt
        ? formatUploadedAt(video.uploadedAt, t)
        : '';
    const views = coerceViewCount(video.views);
    const isLive = isVideoLive(video);

    const metadataLine = (() => {
        if (isLive) {
            if (views > 0) {
                return `${formatViewCount(views)} ${t('youtubePage.watching')}`;
            }
            return t('youtubePage.liveNow');
        }

        if (views > 0 && uploadedAtLabel) {
            return `${formatViewCount(views)} ${viewsLabel} • ${uploadedAtLabel}`;
        }
        if (views > 0) {
            return `${formatViewCount(views)} ${viewsLabel}`;
        }
        if (uploadedAtLabel) {
            return uploadedAtLabel;
        }
        return null;
    })();

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
                'relative flex h-[100px] w-full cursor-pointer items-start gap-3 rounded-lg p-2 text-left text-sm',
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
                {isLive ? (
                    <div className="absolute bottom-1 right-1">
                        <LiveBadge />
                    </div>
                ) : (
                    video.duration_formatted && (
                        <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs text-white">
                            {video.duration_formatted}
                        </div>
                    )
                )}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
                <div className="line-clamp-2 break-words text-sm font-medium leading-snug">
                    {video.title}
                </div>
                <VideoChannels video={video} tone="muted" maxLines={2} />
                {metadataLine ? (
                    <div className="line-clamp-1 text-xs text-muted-foreground">{metadataLine}</div>
                ) : null}
            </div>
        </div>
    );
});
