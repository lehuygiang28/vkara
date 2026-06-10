'use client';

import { coerceViewCount, formatViewCount, normalizeVideoChannels } from '@vkara/youtube';
import { isVideoLive } from '@vkara/tiktok';

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

    const channels = normalizeVideoChannels(playingNow);
    const primaryChannel = channels[0]?.name;
    const views = coerceViewCount(playingNow.views);
    const isLive = isVideoLive({ video: playingNow });

    const metaParts: string[] = [];
    if (primaryChannel) {
        metaParts.push(primaryChannel);
    }
    if (isLive) {
        metaParts.push(tYoutube('liveNow'));
    } else if (views > 0) {
        metaParts.push(`${formatViewCount(views)} ${tSearch('views')}`);
    }

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
            {metaParts.length > 0 ? (
                <p className="mt-2 line-clamp-1 text-base font-medium text-zinc-200 md:text-xl">
                    {metaParts.join(' · ')}
                </p>
            ) : null}
        </header>
    );
}
