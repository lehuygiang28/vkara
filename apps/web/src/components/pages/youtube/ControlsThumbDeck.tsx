'use client';

import { useState } from 'react';
import { ChevronDown, Mic } from 'lucide-react';

import { usePlaybackDisplayTime } from '@/hooks/use-playback-display-time';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';
import { isTikTokPhotoPost, isVideoLive } from '@vkara/tiktok';
import { useScopedI18n } from '@/locales/client';

import { PlaybackScrubber } from '@/components/pages/youtube/PlaybackScrubber';
import { PlayerControls } from '@/components/pages/youtube/PlayerControls';
import {
    TikTokPhotoNavigationBar,
    useTikTokPhotoIndex,
} from '@/components/pages/youtube/tiktok-photo-controls';
import { VideoChannels } from '@/components/video-channels';
import { KaraokeScorePanel } from '@/components/karaoke/karaoke-score-panel';

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
    const { room } = useYouTubeStore();
    const displayTime = usePlaybackDisplayTime({ enabled: tickEnabled });
    const { handleSeekToSeconds, handleTikTokPhotoNavigate } = usePlayerAction();
    const [scoringOpen, setScoringOpen] = useState(false);

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
                <div className="space-y-0.5 px-0.5 text-center">
                    <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug">
                        {playing.title}
                    </h2>
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

                {/* Karaoke scoring — optional, collapsed by default */}
                <div>
                    <button
                        type="button"
                        onClick={() => setScoringOpen((v) => !v)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                        aria-expanded={scoringOpen}
                    >
                        <span className="flex items-center gap-2 font-medium">
                            <Mic className="h-4 w-4" />
                            Chấm điểm karaoke
                        </span>
                        <ChevronDown
                            className={cn(
                                'h-4 w-4 transition-transform duration-200',
                                scoringOpen && 'rotate-180',
                            )}
                        />
                    </button>

                    {scoringOpen ? (
                        <div className="mt-2">
                            <KaraokeScorePanel />
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

