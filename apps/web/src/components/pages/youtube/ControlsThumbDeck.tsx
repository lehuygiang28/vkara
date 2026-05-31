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
            className={cn(
                'shrink-0 border-t border-border/50 bg-background/90 pb-2 pt-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
                className,
            )}
            aria-label="Playback controls"
        >
            <div className="mx-auto flex w-full max-w-md flex-col gap-3">
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
