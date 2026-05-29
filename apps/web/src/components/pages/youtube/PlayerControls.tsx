'use client';

import {
    Pause,
    Play,
    RotateCcw,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SeekToInput } from '@/components/seek-to-input';
import { cn } from '@/lib/utils';

interface PlayerControlsProps {
    variant?: 'bar' | 'panel';
    className?: string;
}

export function PlayerControls({ variant = 'bar', className }: PlayerControlsProps) {
    const t = useScopedI18n('youtubePage');
    const { volume, room, setVolume } = useYouTubeStore();
    const {
        handlePlayerPlay,
        handlePlayerPause,
        handleReplayVideo,
        handlePlayNextVideo,
        handleSeekToSeconds,
        handleSetVideoVolume,
    } = usePlayerAction();

    const disabled = !room?.playingNow;
    const isMuted = volume === 0;

    const toggleMute = () => {
        handleSetVideoVolume(isMuted ? 60 : 0);
    };

    if (variant === 'panel') {
        return (
            <div className={cn('flex flex-col gap-6 p-4', className)}>
                <div className="flex items-center justify-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={handleReplayVideo}
                        disabled={disabled}
                        aria-label={t('replay')}
                    >
                        <RotateCcw className="h-5 w-5" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        className="h-16 w-16 rounded-full"
                        onClick={room?.isPlaying ? handlePlayerPause : handlePlayerPlay}
                        disabled={disabled}
                        aria-label={room?.isPlaying ? t('pause') : t('play')}
                    >
                        {room?.isPlaying ? (
                            <Pause className="h-8 w-8" fill="currentColor" />
                        ) : (
                            <Play className="h-8 w-8" fill="currentColor" />
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={handlePlayNextVideo}
                        disabled={!room?.videoQueue.length}
                        aria-label={t('next')}
                    >
                        <SkipForward className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        aria-label={isMuted ? t('unmute') : t('mute')}
                    >
                        {isMuted ? (
                            <VolumeX className="h-5 w-5" />
                        ) : (
                            <Volume2 className="h-5 w-5" />
                        )}
                    </Button>
                    <Slider
                        value={[volume]}
                        max={100}
                        step={5}
                        onValueChange={(value) => setVolume(value[0] ?? 0)}
                        onValueCommit={(value) => handleSetVideoVolume(value[0] ?? 0)}
                        className="flex-1"
                        aria-label={t('volume')}
                    />
                </div>
                <SeekToInput onSeek={handleSeekToSeconds} disabled={disabled} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-center gap-3 md:justify-between',
                className,
            )}
        >
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={handleReplayVideo}
                    disabled={disabled}
                    aria-label={t('replay')}
                >
                    <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                    type="button"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={room?.isPlaying ? handlePlayerPause : handlePlayerPlay}
                    disabled={disabled}
                    aria-label={room?.isPlaying ? t('pause') : t('play')}
                >
                    {room?.isPlaying ? (
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
            <div className="flex min-w-[10rem] max-w-xs flex-1 items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={toggleMute}
                    aria-label={isMuted ? t('unmute') : t('mute')}
                >
                    {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                    ) : (
                        <Volume2 className="h-5 w-5" />
                    )}
                </Button>
                <Slider
                    value={[volume]}
                    max={100}
                    step={5}
                    onValueChange={(value) => setVolume(value[0] ?? 0)}
                    onValueCommit={(value) => handleSetVideoVolume(value[0] ?? 0)}
                    className="flex-1"
                    aria-label={t('volume')}
                />
            </div>
            <div className="hidden lg:block">
                <SeekToInput onSeek={handleSeekToSeconds} disabled={disabled} />
            </div>
        </div>
    );
}
