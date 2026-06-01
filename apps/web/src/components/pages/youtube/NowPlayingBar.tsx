'use client';

import { useEffect } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';

import { getYouTubeThumbnailUrl } from '@vkara/shared-utils';
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
                'flex items-center gap-3 border-t bg-background/95 px-safe-offset py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80',
                className,
            )}
        >
            <button
                type="button"
                onClick={onOpenControls}
                aria-label={`${isPlaying ? t('nowPlaying') : t('pause')}: ${playing.title}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
            >
                <NowPlayingArtwork
                    src={getYouTubeThumbnailUrl(playing.thumbnails, 'list', playing.id)}
                    title={playing.title}
                    isPlaying={Boolean(isPlaying)}
                    isLive={isLive}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="line-clamp-2 break-words text-sm font-semibold leading-snug">
                        {playing.title}
                    </p>
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
