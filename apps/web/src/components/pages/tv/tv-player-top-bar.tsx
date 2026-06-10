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
                'tv-player-top-bar min-w-0 w-full pr-4 transition-[padding] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:pr-8',
                reserveQrSpace && 'tv-player-top-bar--qr-visible',
                className,
            )}
        >
            <h1 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-tight text-white md:text-[1.85rem] lg:text-[2rem]">
                {playingNow.title}
            </h1>
            <div className="tv-player-top-bar__meta mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <VideoChannels
                    video={playingNow}
                    tone="inverse"
                    maxLines={2}
                    className="tv-player-top-bar__channels min-w-0 flex-1 text-base font-medium md:text-xl"
                />
                {isLive ? (
                    <span className="shrink-0 text-base font-medium text-zinc-200 md:text-xl">
                        · {tYoutube('liveNow')}
                    </span>
                ) : viewsLabel ? (
                    <span className="shrink-0 text-base font-medium tabular-nums text-zinc-200 md:text-xl">
                        · {viewsLabel}
                    </span>
                ) : null}
            </div>
        </header>
    );
}
