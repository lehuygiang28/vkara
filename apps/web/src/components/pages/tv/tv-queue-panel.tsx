'use client';

import { useMemo } from 'react';
import type { YouTubeVideo } from '@vkara/youtube';

import { useScopedI18n } from '@/locales/client';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { cn } from '@/lib/utils';

import { TvQueueVideoCard } from './tv-queue-video-card';
import { TvSpatialOverlayShell } from './tv-spatial-overlay-shell';

const EMPTY_VIDEO_QUEUE: YouTubeVideo[] = [];

type TvQueuePanelProps = {
    embedded?: boolean;
    expanded?: boolean;
    focusEnabled?: boolean;
    onCloseAction?: () => void;
    onLeaveQueueAction?: () => void;
};

export function TvQueuePanel({
    embedded = false,
    expanded = true,
    focusEnabled = true,
    onCloseAction,
    onLeaveQueueAction,
}: TvQueuePanelProps) {
    const t = useScopedI18n('tvPage');
    const tSearch = useScopedI18n('videoSearch');
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const videoQueue = useYouTubeStore(
        (s) => s.room?.videoQueue ?? EMPTY_VIDEO_QUEUE,
    );
    const { handlePlayVideoNow } = usePlayerAction();

    const allItems = useMemo(
        () => [
            ...(playingNow ? [playingNow] : []),
            ...videoQueue.filter((v) => v.id !== playingNow?.id),
        ],
        [playingNow, videoQueue],
    );

    const preferredFocusKey = playingNow
        ? TV_FOCUS_KEYS.queueItem(playingNow.id)
        : allItems[0]
          ? TV_FOCUS_KEYS.queueItem(allItems[0].id)
          : TV_FOCUS_KEYS.queuePanel;

    return (
        <TvSpatialOverlayShell
            focusKey={TV_FOCUS_KEYS.queuePanel}
            preferredChildFocusKey={preferredFocusKey}
            dismissDirection={embedded ? undefined : 'up'}
            onDismissAction={embedded ? undefined : onCloseAction}
            trapFocus={false}
            onMountFocus={!embedded && allItems.length > 0}
            className={cn(
                'tv-queue-panel shrink-0 px-8 pt-4 md:px-12 lg:px-16',
                embedded ? 'pb-2' : 'pb-8 pt-5',
                embedded &&
                    'tv-queue-panel--embedded',
                embedded && (expanded ? 'tv-queue-panel--expanded' : 'tv-queue-panel--peek'),
                !embedded &&
                    'border-t border-white/15 bg-gradient-to-t from-black/55 via-black/45 to-black/35',
                embedded && !expanded && 'pointer-events-none',
            )}
            aria-label={t('queue')}
        >
            {!embedded ? (
                <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h2 className="text-lg font-semibold text-white md:text-xl">{t('queue')}</h2>
                    {allItems.length > 0 ? (
                        <p className="text-sm text-zinc-400">
                            {t('queueCount', { count: allItems.length })}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {allItems.length === 0 ? (
                <p className="py-4 text-center text-base text-zinc-500">{t('queueEmpty')}</p>
            ) : (
                <div className="tv-queue-track flex snap-x snap-mandatory snap-always gap-5 overflow-x-auto px-0.5 pb-2 pt-0.5 md:gap-7 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {allItems.map((video) => (
                        <TvQueueVideoCard
                            key={video.id}
                            video={video}
                            focusEnabled={focusEnabled}
                            isNowPlaying={playingNow?.id === video.id}
                            nowPlayingLabel={t('nowPlaying')}
                            viewsLabel={tSearch('views')}
                            onPlayAction={() => {
                                if (playingNow?.id !== video.id) {
                                    handlePlayVideoNow(video);
                                }
                            }}
                            onLeaveQueueAction={onLeaveQueueAction}
                        />
                    ))}
                </div>
            )}
        </TvSpatialOverlayShell>
    );
}
