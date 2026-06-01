'use client';

import { useEffect, useRef } from 'react';
import {
    Captions,
    CaptionsOff,
    FastForward,
    Pause,
    Play,
    Rewind,
    RotateCcw,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useI18n, useScopedI18n } from '@/locales/client';
import { usePlaybackDisplayTime } from '@/hooks/use-playback-display-time';
import { usePlayerAction } from '@/hooks/use-player-action';
import { toastSessionNotReady } from '@/lib/session-toast';
import { useWebSocket } from '@/providers/websocket-provider';
import { useYouTubeStore } from '@/store/youtubeStore';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface PlayerControlsProps {
    variant?: 'bar' | 'panel';
    className?: string;
}

const SKIP_SECONDS = 10;

function SeekBySecondsButton({
    direction,
    onClick,
    disabled,
    label,
    className,
}: {
    direction: 'back' | 'forward';
    onClick: () => void;
    disabled?: boolean;
    label: string;
    className?: string;
}) {
    const Icon = direction === 'back' ? Rewind : FastForward;

    return (
        <Button
            type="button"
            variant="ghost"
            className={cn(
                'h-11 min-w-11 flex-col gap-0.5 rounded-full px-1.5 text-muted-foreground hover:text-foreground',
                className,
            )}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
        >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[10px] font-semibold leading-none tabular-nums">10</span>
        </Button>
    );
}

export function PlayerControls({ variant = 'bar', className }: PlayerControlsProps) {
    const t = useScopedI18n('youtubePage');
    const tToast = useI18n();
    const { ensureConnectedAndSend } = useWebSocket();
    const { volume, room, setVolume } = useYouTubeStore();
    const captionsEnabled = room?.captionsEnabled ?? false;
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
    const preMuteVolumeRef = useRef(100);
    const displayTime = usePlaybackDisplayTime();

    useEffect(() => {
        if (volume > 0) {
            preMuteVolumeRef.current = volume;
        }
    }, [volume]);

    const toggleMute = () => {
        if (isMuted) {
            handleSetVideoVolume(preMuteVolumeRef.current);
            return;
        }
        preMuteVolumeRef.current = volume > 0 ? volume : 100;
        handleSetVideoVolume(0);
    };

    const skipRelative = (delta: number) => {
        const next = Math.max(0, displayTime + delta);
        handleSeekToSeconds(next);
    };

    const toggleCaptions = () => {
        if (!room?.id) {
            toastSessionNotReady({
                title: tToast('toast.sessionNotReady'),
                description: tToast('toast.sessionNotReadyDescription'),
            });
            return;
        }

        ensureConnectedAndSend({
            type: 'setCaptionsEnabled',
            enabled: !captionsEnabled,
        });
    };

    if (variant === 'panel') {
        return (
            <div className={cn('flex flex-col gap-3', className)}>
                <div className="grid grid-cols-[3.25rem_1fr_3.25rem] items-center gap-2">
                    <SeekBySecondsButton
                        direction="back"
                        className="justify-self-start"
                        onClick={() => skipRelative(-SKIP_SECONDS)}
                        disabled={disabled}
                        label={t('skipBack10')}
                    />

                    <div className="flex items-center justify-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-full"
                            onClick={handleReplayVideo}
                            disabled={disabled}
                            aria-label={t('replay')}
                        >
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            className="h-[4.25rem] w-[4.25rem] rounded-full"
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
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-full"
                            onClick={handlePlayNextVideo}
                            disabled={!room?.videoQueue.length}
                            aria-label={t('next')}
                        >
                            <SkipForward className="h-5 w-5" />
                        </Button>
                    </div>

                    <SeekBySecondsButton
                        direction="forward"
                        className="justify-self-end"
                        onClick={() => skipRelative(SKIP_SECONDS)}
                        disabled={disabled}
                        label={t('skipForward10')}
                    />
                </div>

                <div className="rounded-xl border bg-muted/30 p-2.5">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0"
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
                        <span className="w-9 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                            {volume}
                        </span>
                        <Button
                            type="button"
                            variant={captionsEnabled ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            onClick={toggleCaptions}
                            disabled={disabled}
                            aria-label={captionsEnabled ? t('captionsOff') : t('captionsOn')}
                            aria-pressed={captionsEnabled}
                        >
                            {captionsEnabled ? (
                                <Captions className="h-5 w-5" />
                            ) : (
                                <CaptionsOff className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>
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
                <Button
                    type="button"
                    variant={captionsEnabled ? 'secondary' : 'ghost'}
                    size="icon"
                    className="shrink-0"
                    onClick={toggleCaptions}
                    disabled={disabled}
                    aria-label={captionsEnabled ? t('captionsOff') : t('captionsOn')}
                    aria-pressed={captionsEnabled}
                >
                    {captionsEnabled ? (
                        <Captions className="h-5 w-5" />
                    ) : (
                        <CaptionsOff className="h-5 w-5" />
                    )}
                </Button>
            </div>
        </div>
    );
}
