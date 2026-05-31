'use client';

import { getYouTubeThumbnailUrl, getYouTubeThumbnailSrcSet } from '@vkara/shared-utils';
import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';

import { ControlsStageThumbnail } from '@/components/pages/youtube/ControlsStageThumbnail';
import { VideoChannels } from '@/components/video-channels';
import { LiveBadge } from '@/components/youtube-live-badge';
import { isVideoLive } from '@/lib/youtube-video';

interface ControlsNowPlayingMetaProps {
    className?: string;
}

export function ControlsNowPlayingMeta({ className }: ControlsNowPlayingMetaProps) {
    const t = useScopedI18n('youtubePage');
    const { room } = useYouTubeStore();

    const playing = room?.playingNow;
    if (!playing) {
        return null;
    }

    const isLive = isVideoLive(playing);

    return (
        <section
            className={cn(
                'relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-2 py-2',
                className,
            )}
            aria-label={t('nowPlaying')}
        >
            <ControlsStageThumbnail
                src={getYouTubeThumbnailUrl(playing.thumbnails, 'large', playing.id)}
                srcSet={getYouTubeThumbnailSrcSet(playing.thumbnails, playing.id)}
                title={playing.title}
            />

            <div className="w-full max-w-md space-y-1 text-center">
                <div className="flex min-w-0 items-start justify-center gap-2">
                    <h2 className="line-clamp-2 min-w-0 flex-1 break-words text-base font-semibold leading-snug">
                        {playing.title}
                    </h2>
                    {isLive ? <LiveBadge variant="inline" className="mt-0.5 shrink-0" /> : null}
                </div>
                <VideoChannels
                    video={playing}
                    tone="emphasis"
                    maxLines={2}
                    className="justify-center text-sm text-muted-foreground"
                />
            </div>
        </section>
    );
}
