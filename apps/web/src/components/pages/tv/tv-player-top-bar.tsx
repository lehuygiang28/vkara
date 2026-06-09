'use client';

import { coerceViewCount, formatViewCount, normalizeVideoChannels } from '@vkara/youtube';
import { isVideoLive } from '@vkara/tiktok';

import { TvPlayerQrZone } from '@/components/pages/youtube/TvPlayerQrZone';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';

type TvPlayerTopBarProps = {
    showQrInPlayer: boolean;
    onOpenSettingsAction: () => void;
    className?: string;
};

/** Top row: corner QR (optional) + now-playing title. Flex layout avoids overlap with absolute QR. */
export function TvPlayerTopBar({
    showQrInPlayer,
    onOpenSettingsAction,
    className,
}: TvPlayerTopBarProps) {
    const tSearch = useScopedI18n('videoSearch');
    const tYoutube = useScopedI18n('youtubePage');
    const locale = useCurrentLocale();

    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const roomId = useYouTubeStore((s) => s.room?.id);
    const roomPassword = useYouTubeStore((s) => s.room?.password);

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

    const showQr = Boolean(showQrInPlayer && roomId);

    return (
        <div
            className={cn(
                'flex w-full min-w-0 items-start gap-5 md:gap-6 lg:gap-8',
                className,
            )}
        >
            {showQr ? (
                <div className="shrink-0" data-tv-qr-zone>
                    <TvPlayerQrZone
                        roomId={roomId!}
                        roomPassword={roomPassword}
                        locale={locale}
                        showQR={showQrInPlayer}
                        isIdle={false}
                        disableLayoutMorph
                        forceCornerVisible
                        onOpenSettingsAction={onOpenSettingsAction}
                    />
                </div>
            ) : null}

            <header className="min-w-0 flex-1 pr-4 md:pr-8">
                <h1 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-tight text-white md:text-[1.85rem] lg:text-[2rem]">
                    {playingNow.title}
                </h1>
                {metaParts.length > 0 ? (
                    <p className="mt-2 line-clamp-1 text-base font-medium text-zinc-200 md:text-xl">
                        {metaParts.join(' · ')}
                    </p>
                ) : null}
            </header>
        </div>
    );
}
