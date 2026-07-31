'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    isTvBackKey,
    isTvExitKey,
    isTvMediaActionKey,
    isTvNavigationKey,
    isTvRevealKey,
    resolveTvRemoteKey,
    seedTvFocus,
    tryExitTizenApp,
    TV_FOCUS_KEYS,
    TV_MEDIA_SEEK_SECONDS,
} from '@/lib/tv-spatial-nav';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const HIDE_DELAY_MS = 5000;

type UseTvOverlayStackOptions = {
    /** Player mode: auto-hide control bar. Lobby still uses settings/back stack. */
    controlsEnabled?: boolean;
    /** Focus target when opening settings (lobby vs in-room). */
    settingsOpenFocusKey?: string;
    /** Focus target when closing settings. */
    settingsCloseFocusKey?: string;
    /** In-room idle: re-seed this leaf when D-pad is pressed and controls are hidden. */
    idleFocusKey?: string;
    /** Next-up countdown overlay is visible — Back dismisses it first via countdown store. */
    isNextUpVisible?: boolean;
};

export function useTvOverlayStack({
    controlsEnabled = true,
    settingsOpenFocusKey = TV_FOCUS_KEYS.settingsQrToggle,
    settingsCloseFocusKey = TV_FOCUS_KEYS.ctrlPlayPause,
    idleFocusKey,
    isNextUpVisible = false,
}: UseTvOverlayStackOptions = {}) {
    const [controlsVisible, setControlsVisible] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [queueExpanded, setQueueExpanded] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const controlsVisibleRef = useRef(controlsVisible);
    const settingsOpenRef = useRef(settingsOpen);
    const queueExpandedRef = useRef(queueExpanded);
    const controlsEnabledRef = useRef(controlsEnabled);
    const idleFocusKeyRef = useRef(idleFocusKey);
    const isNextUpVisibleRef = useRef(isNextUpVisible);
    controlsVisibleRef.current = controlsVisible;
    settingsOpenRef.current = settingsOpen;
    queueExpandedRef.current = queueExpanded;
    controlsEnabledRef.current = controlsEnabled;
    idleFocusKeyRef.current = idleFocusKey;
    isNextUpVisibleRef.current = isNextUpVisible;

    const {
        handlePlayerPlay,
        handlePlayerPause,
        handleReplayVideo,
        handlePlayNextVideo,
        handleSeekRelative,
    } = usePlayerAction();

    const drawerOpen = settingsOpen;

    const clearHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const scheduleHide = useCallback(() => {
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
            setSettingsOpen(false);
            setQueueExpanded(false);
        }, HIDE_DELAY_MS);
    }, [clearHideTimer]);

    const revealControls = useCallback(() => {
        if (!controlsEnabled) {
            return;
        }
        setControlsVisible(true);
        if (!drawerOpen) {
            scheduleHide();
        }
    }, [controlsEnabled, drawerOpen, scheduleHide]);

    const hideControls = useCallback(() => {
        clearHideTimer();
        setControlsVisible(false);
        setSettingsOpen(false);
        setQueueExpanded(false);
    }, [clearHideTimer]);

    const collapseQueue = useCallback(() => {
        setQueueExpanded(false);
        seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
    }, []);

    const focusQueue = useCallback(() => {
        if (!controlsEnabled) {
            return;
        }
        setSettingsOpen(false);
        setControlsVisible(true);
        setQueueExpanded(true);
        clearHideTimer();
        const playingId = useYouTubeStore.getState().room?.playingNow?.id;
        if (playingId) {
            seedTvFocus(TV_FOCUS_KEYS.queueItem(playingId));
            return;
        }
        const firstQueued = useYouTubeStore.getState().room?.videoQueue?.[0]?.id;
        if (firstQueued) {
            seedTvFocus(TV_FOCUS_KEYS.queueItem(firstQueued));
            return;
        }
        seedTvFocus(TV_FOCUS_KEYS.queuePanel);
    }, [controlsEnabled, clearHideTimer]);

    const openSettings = useCallback(() => {
        setSettingsOpen(true);
        setQueueExpanded(false);
        if (controlsEnabled) {
            setControlsVisible(true);
        }
        clearHideTimer();
        seedTvFocus(settingsOpenFocusKey);
    }, [controlsEnabled, clearHideTimer, settingsOpenFocusKey]);

    const closeSettings = useCallback(() => {
        setSettingsOpen(false);
        setQueueExpanded(false);
        if (controlsEnabled) {
            revealControls();
        }
        seedTvFocus(settingsCloseFocusKey);
    }, [controlsEnabled, revealControls, settingsCloseFocusKey]);

    const toggleSettings = useCallback(() => {
        if (settingsOpen) {
            closeSettings();
            return;
        }
        openSettings();
    }, [settingsOpen, openSettings, closeSettings]);

    const closeDrawers = useCallback(() => {
        setSettingsOpen(false);
        revealControls();
        seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
    }, [revealControls]);

    const handleBack = useCallback(() => {
        if (isNextUpVisibleRef.current) {
            useCountdownStore.getState().cancelCountdown();
            return true;
        }

        if (settingsOpen) {
            closeSettings();
            return true;
        }

        if (queueExpanded) {
            collapseQueue();
            return true;
        }

        if (controlsVisible) {
            hideControls();
            return true;
        }

        // Root: exit Tizen widget when available (Samsung Return policy).
        return tryExitTizenApp();
    }, [settingsOpen, queueExpanded, controlsVisible, closeSettings, collapseQueue, hideControls]);

    const handleMediaKey = useCallback(
        (key: string) => {
            const room = useYouTubeStore.getState().room;
            if (!room?.playingNow) {
                return false;
            }

            switch (key) {
                case 'MediaPlayPause':
                    if (room.isPlaying) {
                        void handlePlayerPause();
                    } else {
                        void handlePlayerPlay();
                    }
                    return true;
                case 'MediaPlay':
                    void handlePlayerPlay();
                    return true;
                case 'MediaPause':
                case 'MediaStop':
                    void handlePlayerPause();
                    return true;
                case 'MediaTrackNext':
                    void handlePlayNextVideo();
                    return true;
                case 'MediaTrackPrevious':
                    void handleReplayVideo();
                    return true;
                case 'MediaRewind':
                    handleSeekRelative(-TV_MEDIA_SEEK_SECONDS);
                    return true;
                case 'MediaFastForward':
                    handleSeekRelative(TV_MEDIA_SEEK_SECONDS);
                    return true;
                default:
                    return false;
            }
        },
        [
            handlePlayerPlay,
            handlePlayerPause,
            handlePlayNextVideo,
            handleReplayVideo,
            handleSeekRelative,
        ],
    );

    useEffect(() => {
        if (!controlsEnabled) {
            setControlsVisible(false);
            setQueueExpanded(false);
            clearHideTimer();
        }
    }, [controlsEnabled, clearHideTimer]);

    useEffect(() => {
        if (drawerOpen) {
            setControlsVisible(true);
            clearHideTimer();
            return;
        }

        if (controlsVisible) {
            scheduleHide();
        }
    }, [drawerOpen, controlsVisible, scheduleHide, clearHideTimer]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const resolvedKey = resolveTvRemoteKey(event);

            if (isTvExitKey(event)) {
                event.preventDefault();
                event.stopPropagation();
                tryExitTizenApp();
                return;
            }

            if (isTvBackKey(event)) {
                event.preventDefault();
                event.stopPropagation();
                handleBack();
                return;
            }

            if (isTvMediaActionKey(event)) {
                if (handleMediaKey(resolvedKey)) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (controlsEnabledRef.current && !settingsOpenRef.current) {
                        revealControls();
                    }
                }
                return;
            }

            if (isTvRevealKey(event)) {
                if (settingsOpenRef.current) {
                    return;
                }

                // Lobby / idle — spatial nav owns arrows; idle re-seeds QR when focus was lost.
                if (!controlsEnabledRef.current) {
                    if (
                        idleFocusKeyRef.current &&
                        !settingsOpenRef.current &&
                        isTvNavigationKey(event)
                    ) {
                        seedTvFocus(idleFocusKeyRef.current);
                    }
                    return;
                }

                const wasHidden = !controlsVisibleRef.current;
                revealControls();

                const active = document.activeElement;
                if (active instanceof HTMLIFrameElement) {
                    active.blur();
                    seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
                    return;
                }

                // Only seed focus when the overlay was hidden. While controls are
                // already visible, let Norigin spatial nav handle arrows/enter.
                if (wasHidden) {
                    seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
                }
            }
        };

        window.addEventListener('keydown', onKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
    }, [handleBack, handleMediaKey, revealControls]);

    useEffect(() => () => clearHideTimer(), [clearHideTimer]);

    return {
        controlsVisible: controlsEnabled && controlsVisible,
        settingsOpen,
        queueExpanded,
        drawerOpen,
        revealControls,
        hideControls,
        focusQueue,
        collapseQueue,
        openSettings,
        toggleSettings,
        closeSettings,
        closeDrawers,
        handleBack,
    };
}
