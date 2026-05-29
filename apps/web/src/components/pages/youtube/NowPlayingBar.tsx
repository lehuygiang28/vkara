/* eslint-disable @next/next/no-img-element */
'use client';

import { Pause, Play, SkipForward } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';
import { cn } from '@/lib/utils';

import { VideoChannels } from '@/components/video-channels';
import { ThinkingIndicator } from '@/components/ui/thinking-indicator';
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

    const nowPlayingStatusMessages = [
        t('nowPlaying'),
        t('nowPlayingStatus2'),
        t('nowPlayingStatus3'),
    ];

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
                className="flex min-w-0 flex-1 flex-col gap-1 text-left"
            >
                <ThinkingIndicator
                    messages={nowPlayingStatusMessages}
                    ariaLabel={t('nowPlayingStatusLabel')}
                    className="px-0 py-0"
                />
                <div className="flex min-w-0 items-start gap-3">
                    <div className="relative shrink-0">
                        <img
                            src={playing.thumbnail.url}
                            alt={playing.title}
                            className={cn(
                                'h-12 w-[4.25rem] rounded-md object-cover transition-shadow duration-300',
                                isPlaying &&
                                    'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
                            )}
                        />
                        {isPlaying ? (
                            <span
                                className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                                aria-hidden
                            />
                        ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="line-clamp-2 break-words text-sm font-semibold leading-snug">
                            {playing.title}
                        </p>
                        <VideoChannels video={playing} tone="emphasis" maxLines={2} />
                    </div>
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
