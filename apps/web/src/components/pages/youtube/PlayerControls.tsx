'use client';

import { useEffect, useRef } from 'react';
import {
    FastForward,
    Pause,
    Play,
    Rewind,
    RotateCcw,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import { useI18n, useScopedI18n } from '@/locales/client';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useRemoteVolumeSlider } from '@/hooks/use-remote-volume-slider';
import { toast } from '@/hooks/use-toast';
import { toastSessionNotReady } from '@/lib/session-toast';
import { beginVolumeGesture, endVolumeGesture } from '@/lib/remote-gesture-sync';
import { useWebSocket } from '@/providers/websocket-provider';
import { isTikTokVideo, isTikTokPhotoPost } from '@vkara/tiktok';
import { useYouTubeStore } from '@/store/youtubeStore';
import { CaptionsMenu } from '@/components/pages/youtube/captions-menu';
import { TikTokPlaybackUtilities } from '@/components/pages/youtube/tiktok-playback-utilities';
import { VolumeScrubber } from '@/components/pages/youtube/VolumeScrubber';
import { Button } from '@/components/ui/button';
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
    const { volume, room } = useYouTubeStore();
    const captionsEnabled = room?.captionsEnabled ?? false;
    const captionsLanguage = room?.captionsLanguage ?? DEFAULT_CAPTION_LANGUAGE;
    const captionTracks = room?.captionTracks ?? [];
    const playingVideoId = room?.playingNow?.id;
    const captionsTracksLoading =
        Boolean(playingVideoId) && room?.captionTracksVideoId !== playingVideoId;
    const captionsUnavailable =
        Boolean(playingVideoId) &&
        room?.captionTracksVideoId === playingVideoId &&
        captionTracks.length === 0;
    const {
        handlePlayerPlay,
        handlePlayerPause,
        handleReplayVideo,
        handlePlayNextVideo,
        handleSeekRelative,
        handleSetVideoVolume,
    } = usePlayerAction();

    const disabled = !room?.playingNow;
    const isTikTokNow = room?.playingNow ? isTikTokVideo(room.playingNow) : false;
    const isTikTokPhotoNow = room?.playingNow
        ? isTikTokPhotoPost({ video: room.playingNow })
        : false;
    const isMuted = volume === 0;
    const preMuteVolumeRef = useRef(100);
    const { shownVolume, isAdjustingVolume, sliderHandlers } = useRemoteVolumeSlider({
        volume,
        commitVolumeToRoomAction: handleSetVideoVolume,
    });

    useEffect(() => {
        if (volume > 0) {
            preMuteVolumeRef.current = volume;
        }
    }, [volume]);

    const toggleMute = () => {
        if (isTikTokNow) {
            void handleSetVideoVolume(isMuted ? 100 : 0);
            return;
        }

        if (isMuted) {
            const next = preMuteVolumeRef.current;
            beginVolumeGesture(0);
            endVolumeGesture(next);
            void handleSetVideoVolume(next);
            return;
        }

        preMuteVolumeRef.current = volume > 0 ? volume : 100;
        beginVolumeGesture(volume);
        endVolumeGesture(0);
        void handleSetVideoVolume(0);
    };

    const handleCaptionsSelect = (languageCode: string | null) => {
        if (!room?.id) {
            toastSessionNotReady({
                title: tToast('toast.sessionNotReady'),
                description: tToast('toast.sessionNotReadyDescription'),
            });
            return;
        }

        if (languageCode === null) {
            ensureConnectedAndSend({ type: 'setCaptionsEnabled', enabled: false });
            return;
        }

        if (captionsUnavailable) {
            toast({
                id: 'captions-unavailable',
                title: tToast('toast.captionsNoTracks'),
                description: tToast('toast.captionsNoTracksDescription'),
                variant: 'warning',
            });
            return;
        }

        ensureConnectedAndSend({ type: 'setCaptionsLanguage', languageCode });
        if (!captionsEnabled) {
            ensureConnectedAndSend({ type: 'setCaptionsEnabled', enabled: true });
        }
    };

    const handleCaptionsToggle = (enabled: boolean) => {
        if (!room?.id) {
            toastSessionNotReady({
                title: tToast('toast.sessionNotReady'),
                description: tToast('toast.sessionNotReadyDescription'),
            });
            return;
        }

        ensureConnectedAndSend({ type: 'setCaptionsEnabled', enabled });
    };

    const captionsMenu = (
        <CaptionsMenu
            captionsEnabled={captionsEnabled}
            captionsLanguage={captionsLanguage}
            tracks={captionTracks}
            loading={captionsTracksLoading}
            unavailable={captionsUnavailable}
            disabled={disabled}
            loadingLabel={t('captionsTracksLoading')}
            emptyLabel={t('captionsNoTracks')}
            offLabel={t('captionsOffOption')}
            menuLabel={t('captionsMenu')}
            triggerClassName={variant === 'bar' ? 'h-10 w-10' : undefined}
            onSelectAction={handleCaptionsSelect}
        />
    );

    const tikTokUtilities = (
        <TikTokPlaybackUtilities
            isMuted={isMuted}
            captionsEnabled={captionsEnabled}
            captionsDisabled={isTikTokPhotoNow}
            disabled={disabled}
            groupLabel={t('tiktokUtilitiesGroup')}
            soundOnLabel={t('tiktokSoundOn')}
            soundOffLabel={t('tiktokSoundOff')}
            captionsLabel={t('captionsMenu')}
            onMuteToggleAction={toggleMute}
            onCaptionsToggleAction={handleCaptionsToggle}
        />
    );

    const captionsControl = isTikTokNow ? null : captionsMenu;

    if (variant === 'panel') {
        return (
            <div className={cn('flex flex-col gap-2.5 min-[400px]:gap-3', className)}>
                <div className="grid grid-cols-[3.25rem_1fr_3.25rem] items-center gap-2">
                    <SeekBySecondsButton
                        direction="back"
                        className="justify-self-start"
                        onClick={() => handleSeekRelative(-SKIP_SECONDS)}
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
                            className="h-[4.25rem] w-[4.25rem] rounded-full short-viewport:h-14 short-viewport:w-14"
                            onClick={room?.isPlaying ? handlePlayerPause : handlePlayerPlay}
                            disabled={disabled}
                            aria-label={room?.isPlaying ? t('pause') : t('play')}
                        >
                            {room?.isPlaying ? (
                                <Pause
                                    className="h-8 w-8 short-viewport:h-6 short-viewport:w-6"
                                    fill="currentColor"
                                />
                            ) : (
                                <Play
                                    className="h-8 w-8 short-viewport:h-6 short-viewport:w-6"
                                    fill="currentColor"
                                />
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
                        onClick={() => handleSeekRelative(SKIP_SECONDS)}
                        disabled={disabled}
                        label={t('skipForward10')}
                    />
                </div>

                <div className="rounded-lg bg-muted/20 p-2 min-[400px]:p-2.5">
                    {isTikTokNow ? (
                        tikTokUtilities
                    ) : (
                        <div className="flex items-center gap-2 min-[400px]:gap-3">
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
                            <VolumeScrubber
                                shownVolume={shownVolume}
                                isAdjusting={isAdjustingVolume}
                                disabled={disabled}
                                ariaLabel={t('volume')}
                                handlers={sliderHandlers}
                            />
                            <span className="hidden w-9 shrink-0 text-right text-sm tabular-nums text-muted-foreground min-[380px]:inline">
                                {shownVolume}
                            </span>
                            {captionsControl}
                        </div>
                    )}
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
            <div
                className={cn(
                    'flex items-center gap-2',
                    isTikTokNow ? 'w-full justify-center md:flex-1' : 'min-w-[8rem] flex-1',
                )}
            >
                {isTikTokNow ? (
                    tikTokUtilities
                ) : (
                    <>
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
                        <VolumeScrubber
                            shownVolume={shownVolume}
                            isAdjusting={isAdjustingVolume}
                            disabled={disabled}
                            ariaLabel={t('volume')}
                            handlers={sliderHandlers}
                            showDragValue
                        />
                        {captionsControl}
                    </>
                )}
            </div>
        </div>
    );
}
