'use client';

import { coerceViewCount, formatViewCount } from '@vkara/youtube';
import { isVideoLive } from '@vkara/tiktok';

import { VideoChannels } from '@/components/video-channels';
import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';

type TvPlayerTopBarProps = {
    className?: string;
};

/** Now-playing title — offsets when fixed QR is visible in the corner. */
export function TvPlayerTopBar({ className }: TvPlayerTopBarProps) {
    const tSearch = useScopedI18n('videoSearch');
    const tYoutube = useScopedI18n('youtubePage');

    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const roomId = useYouTubeStore((s) => s.room?.id);
    const showQRInPlayer = useYouTubeStore((s) => s.room?.showQRInPlayer ?? true);

    if (!playingNow) {
        return null;
    }

    const views = coerceViewCount(playingNow.views);
    const isLive = isVideoLive({ video: playingNow });
    const viewsLabel = views > 0 && !isLive ? `${formatViewCount(views)} ${tSearch('views')}` : null;

    const reserveQrSpace = Boolean(showQRInPlayer && roomId);

    return (
        <header
            className={cn(
                'tv-player-top-bar min-w-0 w-full',
                reserveQrSpace && 'tv-player-top-bar--qr-visible',
                className,
            )}
        >
            <h1 className="tv-player-top-bar__title line-clamp-2">
                {playingNow.title}
            </h1>
            <div className="tv-player-top-bar__meta mt-2 min-w-0 max-w-full">
                <div className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
                    <VideoChannels
                        video={playingNow}
                        tone="inverse"
                        maxLines={2}
                        className="tv-player-top-bar__channels w-auto min-w-0"
                    />
                    {isLive ? (
                        <span className="tv-player-top-bar__meta-extra shrink-0 text-zinc-200">
                            · {tYoutube('liveNow')}
                        </span>
                    ) : viewsLabel ? (
                        <span className="tv-player-top-bar__meta-extra shrink-0 tabular-nums text-zinc-200">
                            · {viewsLabel}
                        </span>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
