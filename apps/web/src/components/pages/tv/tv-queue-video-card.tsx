'use client';

import type { YouTubeVideo } from '@vkara/youtube';
import { coerceViewCount, formatViewCount } from '@vkara/youtube';
import { getVideoThumbnailUrl, isVideoLive } from '@vkara/tiktok';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';

import { LiveBadge } from '@/components/youtube-live-badge';
import { VideoChannels } from '@/components/video-channels';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import {
    tvFocusShellRect,
    tvQueueMetaLine,
    tvQueueThumbFrame,
    tvQueueTitle,
} from '@/lib/tv-focus-styles';
import { cn } from '@/lib/utils';

import { TvFocusable } from './tv-focusable';

function formatDuration(seconds: number | undefined): string {
    if (!seconds || seconds <= 0) {
        return '';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function scrollCardIntoView(node: HTMLElement | null) {
    if (!node) {
        return;
    }

    const track = node.closest('.tv-queue-track') as HTMLElement | null;
    if (!track) {
        node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        return;
    }

    const trackRect = track.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const delta = nodeRect.left + nodeRect.width / 2 - (trackRect.left + trackRect.width / 2);

    track.scrollTo({ left: track.scrollLeft + delta, behavior: 'smooth' });
}

type TvQueueVideoCardProps = {
    video: YouTubeVideo;
    focusEnabled?: boolean;
    isNowPlaying: boolean;
    nowPlayingLabel: string;
    viewsLabel: string;
    onPlayAction: () => void;
    onLeaveQueueAction?: () => void;
};

export function TvQueueVideoCard({
    video,
    focusEnabled = true,
    isNowPlaying,
    nowPlayingLabel,
    viewsLabel,
    onPlayAction,
    onLeaveQueueAction,
}: TvQueueVideoCardProps) {
    const thumb = getVideoThumbnailUrl({ video, size: 'large' });
    const isLive = isVideoLive({ video });
    const views = coerceViewCount(video.views);
    const durationLabel = video.duration_formatted || formatDuration(video.duration) || undefined;

    const viewsLine = views > 0 && !isLive ? `${formatViewCount(views)} ${viewsLabel}` : null;

    return (
        <TvFocusable
            focusKey={TV_FOCUS_KEYS.queueItem(video.id)}
            accessibilityLabel={video.title}
            disabled={!focusEnabled}
            suppressFocusChrome
            onEnterPress={onPlayAction}
            onArrowPress={(direction) => {
                if (direction === 'up') {
                    onLeaveQueueAction?.();
                    setFocus(TV_FOCUS_KEYS.ctrlPlayPause);
                    return false;
                }
                return true;
            }}
            onFocusAction={() => {
                scrollCardIntoView(
                    document.querySelector(
                        `[data-tv-queue-item="${video.id}"]`,
                    ) as HTMLElement | null,
                );
            }}
            className={({ focused }) => cn('shrink-0 snap-center', tvFocusShellRect(focused))}
        >
            {({ focused }) => (
                <article
                    data-tv-queue-item={video.id}
                    className="w-[17rem] md:w-[21rem] lg:w-[23rem] xl:w-[25rem]"
                >
                    <div className={cn('tv-queue-thumb', tvQueueThumbFrame(focused, isNowPlaying))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                        {isNowPlaying ? (
                            <span
                                className={cn(
                                    'absolute left-2.5 top-2.5 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white md:text-sm',
                                    focused ? 'bg-red-600' : 'bg-red-600/90',
                                )}
                            >
                                {nowPlayingLabel}
                            </span>
                        ) : isLive ? (
                            <div className="absolute left-2.5 top-2.5">
                                <LiveBadge />
                            </div>
                        ) : null}
                        {!isLive && durationLabel ? (
                            <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/90 px-2 py-0.5 text-sm font-bold tabular-nums text-white">
                                {durationLabel}
                            </span>
                        ) : null}
                    </div>

                    <div className="tv-queue-card-meta mt-3 space-y-1">
                        <h3 className={tvQueueTitle(focused)}>{video.title}</h3>
                        <VideoChannels
                            video={video}
                            tone={focused ? 'emphasis' : 'muted'}
                            maxLines={2}
                            className={cn(
                                'tv-queue-card__channels text-sm md:text-base',
                                focused ? 'font-medium text-zinc-600' : 'text-zinc-400',
                            )}
                        />
                        {viewsLine ? (
                            <p className={cn(tvQueueMetaLine(focused), 'tabular-nums')}>
                                {viewsLine}
                            </p>
                        ) : null}
                    </div>
                </article>
            )}
        </TvFocusable>
    );
}
