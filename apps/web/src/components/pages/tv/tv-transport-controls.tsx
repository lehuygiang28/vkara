'use client';

import { Pause, Play, RotateCcw, SkipForward, Settings } from 'lucide-react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';
import { useEffect, type ReactNode } from 'react';

import { useScopedI18n } from '@/locales/client';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';
import { seedTvFocus, TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { tvTransportButton, tvTransportIconClass } from '@/lib/tv-focus-styles';

import { TvFocusable } from './tv-focusable';

type TvTransportControlsProps = {
    visible: boolean;
    settingsOpen: boolean;
    onRevealAction: () => void;
    onQueueFocusAction: () => void;
    onOpenSettingsAction: () => void;
};

function TransportControl({
    focusKey,
    label,
    disabled,
    variant,
    onRevealAction,
    onArrowPress,
    onEnterPress,
    icon,
}: {
    focusKey: string;
    label: string;
    disabled?: boolean;
    variant: 'secondary' | 'primary';
    onRevealAction: () => void;
    onArrowPress: (direction: string) => boolean;
    onEnterPress: () => void;
    icon: ReactNode;
}) {
    return (
        <TvFocusable
            focusKey={focusKey}
            accessibilityLabel={label}
            disabled={disabled}
            suppressFocusChrome
            onFocusAction={onRevealAction}
            onArrowPress={onArrowPress}
            onEnterPress={onEnterPress}
            className="inline-flex shrink-0 items-center justify-center"
        >
            {({ focused }) => (
                <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    className={tvTransportButton(focused, variant)}
                >
                    {icon}
                </button>
            )}
        </TvFocusable>
    );
}

export function TvTransportControls({
    visible,
    settingsOpen,
    onRevealAction,
    onQueueFocusAction,
    onOpenSettingsAction,
}: TvTransportControlsProps) {
    const t = useScopedI18n('tvPage');
    const roomIsPlaying = useYouTubeStore((s) => s.room?.isPlaying ?? false);
    const hasPlaying = Boolean(useYouTubeStore((s) => s.room?.playingNow));

    const { handlePlayerPlay, handlePlayerPause, handleReplayVideo, handlePlayNextVideo } =
        usePlayerAction();

    const { ref, focusKey, focusSelf } = useFocusable({
        focusKey: TV_FOCUS_KEYS.controlBar,
        trackChildren: true,
        preferredChildFocusKey: TV_FOCUS_KEYS.ctrlPlayPause,
        focusable: false,
    });

    const focusQueueFromControls = () => {
        onQueueFocusAction();
        return false;
    };

    const queueDown = (direction: string) =>
        direction === 'down' ? focusQueueFromControls() : true;

    useEffect(() => {
        if (visible && !settingsOpen) {
            focusSelf();
            seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
        }
    }, [visible, settingsOpen, focusSelf]);

    const playPauseLabel = roomIsPlaying ? t('pause') : t('play');
    const transportDisabled = !hasPlaying || !visible;

    return (
        <FocusContext.Provider value={focusKey}>
            <div
                ref={ref}
                className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4"
                role="toolbar"
                aria-label={t('controls')}
            >
                <div className="hidden min-w-0 md:block" aria-hidden />

                <div className="col-start-2 flex items-center justify-center gap-5 md:gap-6">
                    <TransportControl
                        focusKey={TV_FOCUS_KEYS.ctrlReplay}
                        label={t('replay')}
                        disabled={transportDisabled}
                        variant="secondary"
                        onRevealAction={onRevealAction}
                        onArrowPress={queueDown}
                        onEnterPress={() => {
                            if (hasPlaying) {
                                handleReplayVideo();
                            }
                        }}
                        icon={<RotateCcw className={tvTransportIconClass()} strokeWidth={2.5} />}
                    />

                    <TransportControl
                        focusKey={TV_FOCUS_KEYS.ctrlPlayPause}
                        label={playPauseLabel}
                        disabled={transportDisabled}
                        variant="primary"
                        onRevealAction={onRevealAction}
                        onArrowPress={queueDown}
                        onEnterPress={() => {
                            if (!hasPlaying) {
                                return;
                            }
                            if (roomIsPlaying) {
                                handlePlayerPause();
                            } else {
                                handlePlayerPlay();
                            }
                        }}
                        icon={
                            roomIsPlaying ? (
                                <Pause className={tvTransportIconClass()} strokeWidth={2.5} />
                            ) : (
                                <Play
                                    className={tvTransportIconClass({ filled: true })}
                                    strokeWidth={2.5}
                                />
                            )
                        }
                    />

                    <TransportControl
                        focusKey={TV_FOCUS_KEYS.ctrlNext}
                        label={t('next')}
                        disabled={transportDisabled}
                        variant="secondary"
                        onRevealAction={onRevealAction}
                        onArrowPress={queueDown}
                        onEnterPress={() => {
                            if (hasPlaying) {
                                handlePlayNextVideo();
                            }
                        }}
                        icon={<SkipForward className={tvTransportIconClass()} strokeWidth={2.5} />}
                    />
                </div>

                <div className="col-start-3 flex items-center justify-end">
                    <TransportControl
                        focusKey={TV_FOCUS_KEYS.ctrlSettings}
                        label={t('settings')}
                        disabled={!visible || settingsOpen}
                        variant="secondary"
                        onRevealAction={onRevealAction}
                        onArrowPress={queueDown}
                        onEnterPress={onOpenSettingsAction}
                        icon={<Settings className={tvTransportIconClass()} strokeWidth={2.5} />}
                    />
                </div>
            </div>
        </FocusContext.Provider>
    );
}
