'use client';

import { memo, type ReactNode } from 'react';
import { VideoChannels } from '@/components/video-channels';
import { LiveBadge } from '@/components/youtube-live-badge';
import { coerceViewCount, formatViewCount, getYouTubeThumbnailUrl } from '@vkara/shared-utils';
import { formatUploadedAt } from '@/lib/format-uploaded-at';
import { isVideoLive } from '@/lib/youtube-video';
import { cn } from '@/lib/utils';
import { useI18n } from '@/locales/client';
import type { YouTubeVideo } from '@vkara/shared-types';

import { VideoListThumbnail } from './video-list-thumbnail';

/** Base row: title (2 lines) + channels + views. */
export const VIDEO_LIST_ROW_HEIGHT = 100;
/** Action chips row when a video is selected. */
export const VIDEO_LIST_ROW_ACTIONS_HEIGHT = 52;

export function getVideoListRowHeight(hasActions: boolean): number {
    return hasActions ? VIDEO_LIST_ROW_HEIGHT + VIDEO_LIST_ROW_ACTIONS_HEIGHT : VIDEO_LIST_ROW_HEIGHT;
}

interface VideoListItemProps {
    video: YouTubeVideo;
    viewsLabel: string;
    isActive?: boolean;
    actions?: ReactNode;
    onSelect?: (video: YouTubeVideo) => void;
}

export const VideoListItem = memo(function VideoListItem({
    video,
    viewsLabel,
    isActive = false,
    actions,
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
            className={cn(
                'w-full overflow-hidden rounded-lg text-left text-sm',
                isActive && 'bg-accent/30 ring-1 ring-inset ring-primary/40',
            )}
        >
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
                    'flex h-[100px] w-full cursor-pointer items-start gap-3 p-2',
                    'hover:bg-accent/50 active:bg-accent/60',
                )}
            >
                <VideoListThumbnail
                    src={getYouTubeThumbnailUrl(video.thumbnails, 'list', video.id)}
                    overlay={
                        isLive ? (
                            <div className="absolute bottom-1 right-1">
                                <LiveBadge />
                            </div>
                        ) : video.duration_formatted ? (
                            <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs text-white">
                                {video.duration_formatted}
                            </div>
                        ) : null
                    }
                />
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
            {actions ? (
                <div
                    className="border-t border-border/50 px-2 pb-2 pt-1.5"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    {actions}
                </div>
            ) : null}
        </div>
    );
});
