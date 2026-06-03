'use client';

import { usePlaybackDisplayTime } from '@/hooks/use-playback-display-time';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';
import { isVideoLive } from '@/lib/youtube-video';

import { PlaybackScrubber } from '@/components/pages/youtube/PlaybackScrubber';
import { PlayerControls } from '@/components/pages/youtube/PlayerControls';

/**
 * Thumb-zone control cluster pinned above mini-player + bottom nav.
 * No pb-remote-scroll here: chrome lives outside RemoteTabPanel in RemoteShell.
 */
export function ControlsThumbDeck({ className }: { className?: string }) {
    const { room } = useYouTubeStore();
    const displayTime = usePlaybackDisplayTime();
    const { handleSeekToSeconds } = usePlayerAction();

    const playing = room?.playingNow;
    if (!playing) {
        return null;
    }

    const isLive = isVideoLive(playing);
    const duration = playing.duration ?? 0;

    return (
        <section
            className={cn('shrink-0 px-3 pb-3 pt-2', className)}
            aria-label="Playback controls"
        >
            <div
                className={cn(
                    'mx-auto flex w-full max-w-md flex-col gap-4',
                    'rounded-xl border border-border/60 bg-card/95 p-4',
                    'shadow-[0_10px_40px_-12px_rgb(0_0_0/0.55),0_4px_12px_-4px_rgb(0_0_0/0.35)]',
                    'ring-1 ring-inset ring-white/[0.06]',
                    'backdrop-blur-md supports-[backdrop-filter]:bg-card/80',
                )}
            >
                {!isLive && duration > 0 ? (
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
