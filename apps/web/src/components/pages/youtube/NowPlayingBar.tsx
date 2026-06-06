'use client';

import { useEffect } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';

import { getYouTubeThumbnailUrl } from '@vkara/youtube';
import { useScopedI18n } from '@/locales/client';
import { prefetchPlayerControlsTabs } from '@/lib/layout-chunk-prefetch';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';
import { cn } from '@/lib/utils';

import { NowPlayingArtwork } from '@/components/pages/youtube/NowPlayingArtwork';
import { VideoChannels } from '@/components/video-channels';
import { Button } from '@/components/ui/button';
import { isVideoLive } from '@/lib/youtube-video';

interface NowPlayingBarProps {
    className?: string;
    onOpenControls?: () => void;
}

export function NowPlayingBar({ className, onOpenControls }: NowPlayingBarProps) {
    const t = useScopedI18n('youtubePage');
    const { room } = useYouTubeStore();
    const { handlePlayerPlay, handlePlayerPause, handlePlayNextVideo } = usePlayerAction();

    const playing = room?.playingNow;
    const isPlaying = room?.isPlaying;
    const isLive = playing ? isVideoLive(playing) : false;
    const playingId = playing?.id;

    useEffect(() => {
        if (playingId) {
            prefetchPlayerControlsTabs();
        }
    }, [playingId]);

    if (!playing) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex items-center gap-1.5 border-t px-safe-offset py-2',
                'bg-background',
                className,
            )}
        >
            <button
                type="button"
                onClick={onOpenControls}
                aria-label={`${isPlaying ? t('nowPlaying') : t('pause')}: ${playing.title}`}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
                <NowPlayingArtwork
                    src={getYouTubeThumbnailUrl(playing.thumbnails, 'list', playing.id)}
                    videoId={playing.id}
                    title={playing.title}
                    isPlaying={Boolean(isPlaying)}
                    isLive={isLive}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-4">
                        {playing.title}
                    </p>
                    <VideoChannels
                        video={playing}
                        tone="emphasis"
                        maxLines={2}
                        allowNameWrap
                        className="text-xs leading-4 text-muted-foreground"
                    />
                </div>
            </button>
            <div className="flex shrink-0 items-center">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 touch-manipulation rounded-full"
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
                    className="h-10 w-10 touch-manipulation rounded-full"
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
