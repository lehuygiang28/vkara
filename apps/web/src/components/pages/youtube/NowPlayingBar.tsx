'use client';

import { Pause, Play, SkipForward } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';
import { cn } from '@/lib/utils';

import { NowPlayingArtwork } from '@/components/pages/youtube/NowPlayingArtwork';
import { VideoChannels } from '@/components/video-channels';
import { LiveBadge } from '@/components/youtube-live-badge';
import { Button } from '@/components/ui/button';
import { isVideoLive } from '@/lib/youtube-video';

interface NowPlayingBarProps {
    className?: string;
    onOpenQueue?: () => void;
}

export function NowPlayingBar({ className, onOpenQueue }: NowPlayingBarProps) {
    const t = useScopedI18n('youtubePage');
    const { room } = useYouTubeStore();
    const { handlePlayerPlay, handlePlayerPause, handlePlayNextVideo } = usePlayerAction();

    const playing = room?.playingNow;
    const isPlaying = room?.isPlaying;
    const isLive = playing ? isVideoLive(playing) : false;

    if (!playing) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex items-center gap-3 border-t bg-background/95 px-safe-offset py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80',
                className,
            )}
        >
            <button
                type="button"
                onClick={onOpenQueue}
                aria-label={`${isPlaying ? t('nowPlaying') : t('pause')}: ${playing.title}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
            >
                <NowPlayingArtwork
                    src={playing.thumbnail.url}
                    title={playing.title}
                    isPlaying={Boolean(isPlaying)}
                    isLive={isLive}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex min-w-0 items-start gap-2">
                        <p className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-semibold leading-snug">
                            {playing.title}
                        </p>
                        {isLive ? <LiveBadge variant="inline" className="mt-0.5 shrink-0" /> : null}
                    </div>
                    <VideoChannels video={playing} tone="emphasis" maxLines={2} />
                </div>
            </button>
            <div className="flex shrink-0 items-center gap-1 self-center">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-full"
                    onClick={isPlaying ? handlePlayerPause : handlePlayerPlay}
                    aria-label={isPlaying ? t('pause') : t('play')}
                >
                    {isPlaying ? (
                        <Pause className="h-6 w-6" fill="currentColor" />
                    ) : (
                        <Play className="h-6 w-6" fill="currentColor" />
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={handlePlayNextVideo}
                    disabled={!room?.videoQueue.length}
                    aria-label={t('next')}
                >
                    <SkipForward className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
