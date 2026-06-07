'use client';

import { getVideoThumbnailSrcSet, getVideoThumbnailUrl, isVideoLive } from '@vkara/tiktok';
import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';

import { ControlsStageThumbnail } from '@/components/pages/youtube/ControlsStageThumbnail';

interface ControlsNowPlayingMetaProps {
    className?: string;
}

/** Artwork stage — grows to fill space above the bottom control dock (Spotify / YT Music pattern). */
export function ControlsNowPlayingMeta({ className }: ControlsNowPlayingMetaProps) {
    const t = useScopedI18n('youtubePage');
    const { room } = useYouTubeStore();

    const playing = room?.playingNow;
    if (!playing) {
        return null;
    }

    const isLive = isVideoLive({ video: playing });

    return (
        <section
            className={cn('relative z-10 flex min-h-0 w-full flex-col', className)}
            aria-label={t('nowPlaying')}
        >
            <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-2 short-viewport:py-1">
                <ControlsStageThumbnail
                    src={getVideoThumbnailUrl({ video: playing, size: 'large' })}
                    videoId={playing.id}
                    srcSet={getVideoThumbnailSrcSet({ video: playing })}
                    title={playing.title}
                    isLive={isLive}
                />
            </div>
        </section>
    );
}
