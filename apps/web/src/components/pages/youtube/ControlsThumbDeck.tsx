'use client';

import { Star } from 'lucide-react';

import { usePlaybackDisplayTime } from '@/hooks/use-playback-display-time';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useCabinetStore } from '@/store/cabinetStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';
import { isTikTokPhotoPost, isVideoLive } from '@vkara/tiktok';
import { useScopedI18n } from '@/locales/client';

import { Button } from '@/components/ui/button';
import { PlaybackScrubber } from '@/components/pages/youtube/PlaybackScrubber';
import { PlayerControls } from '@/components/pages/youtube/PlayerControls';
import {
    TikTokPhotoNavigationBar,
    useTikTokPhotoIndex,
} from '@/components/pages/youtube/tiktok-photo-controls';
import { VideoChannels } from '@/components/video-channels';

/**
 * Bottom control dock (Spotify / YouTube Music / SoundCloud pattern):
 * metadata, scrubber, transport, and volume pinned above bottom nav.
 */
type ControlsThumbDeckProps = {
    className?: string;
    /** When false, pauses the 1s extrapolation tick (tab hidden but kept mounted). */
    tickEnabled?: boolean;
};

export function ControlsThumbDeck({ className, tickEnabled = true }: ControlsThumbDeckProps) {
    const t = useScopedI18n('youtubePage');
    const tCabinet = useScopedI18n('videoCabinet');
    const { room } = useYouTubeStore();
    const playingId = room?.playingNow?.id;
    const saved = useCabinetStore((state) =>
        playingId ? state.videos.some((item) => item.id === playingId) : false,
    );
    const toggleSaved = useCabinetStore((state) => state.toggle);
    const displayTime = usePlaybackDisplayTime({ enabled: tickEnabled });
    const { handleSeekToSeconds, handleTikTokPhotoNavigate } = usePlayerAction();

    const playing = room?.playingNow;
    const isPhotoPost = playing ? isTikTokPhotoPost({ video: playing }) : false;
    const { index: photoIndex, maxIndex: photoMaxIndex } = useTikTokPhotoIndex(isPhotoPost);

    if (!playing) {
        return null;
    }

    const isLive = isVideoLive({ video: playing });
    const duration = playing.duration ?? 0;

    return (
        <section
            className={cn(
                'shrink-0 px-1 pb-2 pt-1 short-viewport:pb-1.5 min-[400px]:px-2 min-[400px]:pb-3',
                className,
            )}
            aria-label="Playback controls"
        >
            <div className="mx-auto flex w-full max-w-md flex-col gap-3 short-viewport:gap-2.5 min-[400px]:gap-4">
                <div className="space-y-0.5 px-0.5">
                    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1">
                        <span aria-hidden />
                        <h2 className="line-clamp-2 break-words text-center text-base font-semibold leading-snug">
                            {playing.title}
                        </h2>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 justify-self-end rounded-full text-muted-foreground hover:text-foreground"
                            aria-pressed={saved}
                            aria-label={saved ? tCabinet('remove') : tCabinet('save')}
                            onClick={() => toggleSaved(playing)}
                        >
                            <Star
                                className={cn(
                                    'h-5 w-5',
                                    saved && 'fill-amber-400 text-amber-500',
                                )}
                            />
                        </Button>
                    </div>
                    <VideoChannels
                        video={playing}
                        tone="emphasis"
                        align="center"
                        maxLines={2}
                        className="text-sm text-muted-foreground short-viewport:text-xs"
                    />
                </div>

                {isPhotoPost ? (
                    <TikTokPhotoNavigationBar
                        index={photoIndex}
                        maxIndex={photoMaxIndex}
                        prevLabel={t('tiktokPhotoPrev')}
                        nextLabel={t('tiktokPhotoNext')}
                        onNavigateAction={handleTikTokPhotoNavigate}
                    />
                ) : !isLive && duration > 0 ? (
                    <PlaybackScrubber
                        displayTime={displayTime}
                        duration={duration}
                        durationLabel={playing.duration_formatted}
                        onSeek={handleSeekToSeconds}
                    />
                ) : null}

                <PlayerControls variant="panel" className="gap-3 p-0" />
            </div>
        </section>
    );
}
