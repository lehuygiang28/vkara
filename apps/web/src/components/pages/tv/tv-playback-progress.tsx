'use client';

import { isVideoLive } from '@vkara/tiktok';

import { usePlaybackDisplayTime } from '@/hooks/use-playback-display-time';
import { formatPlaybackSeconds } from '@/lib/format-playback-time';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';

type TvPlaybackProgressProps = {
    className?: string;
    /** When false, skips the 1 Hz extrapolation interval (controls hidden). */
    enabled?: boolean;
};

export function TvPlaybackProgress({ className, enabled = true }: TvPlaybackProgressProps) {
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const displayTime = usePlaybackDisplayTime({ enabled: enabled && Boolean(playingNow) });

    if (!playingNow) {
        return null;
    }

    const isLive = isVideoLive({ video: playingNow });
    const duration = Math.max(0, Math.floor(playingNow.duration ?? 0));

    if (isLive || duration <= 0) {
        return null;
    }

    const clampedTime = Math.min(displayTime, duration);
    const progress = duration > 0 ? clampedTime / duration : 0;
    const durationLabel = playingNow.duration_formatted ?? formatPlaybackSeconds(duration);

    return (
        <div className={cn('w-full', className)} role="group" aria-label="Playback progress">
            <div className="tv-playback-progress__labels flex justify-between px-0.5 font-semibold tabular-nums text-white">
                <span>{formatPlaybackSeconds(clampedTime)}</span>
                <span className="text-white/85">{durationLabel}</span>
            </div>
            <div className="tv-playback-progress__track relative w-full overflow-visible rounded-full bg-white/25">
                <div
                    className="absolute left-0 top-0 h-full w-full origin-left rounded-full bg-white"
                    style={{ transform: `scaleX(${progress})` }}
                />
                <div
                    className="tv-playback-progress__thumb absolute top-1/2 rounded-full border-[3px] border-[#3ea6ff] bg-white"
                    style={{
                        left: `${progress * 100}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                    aria-hidden
                />
            </div>
        </div>
    );
}
