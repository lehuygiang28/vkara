/* eslint-disable @next/next/no-img-element */
'use client';

import { Pause, Play, SkipForward } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

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

    if (!playing) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex items-center gap-3 border-t bg-background/95 px-safe-offset py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80',
                className,
            )}
        >
            <button
                type="button"
                onClick={onOpenQueue}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
                <img
                    src={playing.thumbnail.url}
                    alt=""
                    className="h-12 w-[4.25rem] shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">{t('nowPlaying')}</p>
                    <p className="line-clamp-1 text-sm font-semibold">{playing.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                        {playing.channel?.name || '—'}
                    </p>
                </div>
            </button>
            <div className="flex shrink-0 items-center gap-1">
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
