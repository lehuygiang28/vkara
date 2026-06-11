'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    isTvBackKey,
    isTvNavigationKey,
    isTvRevealKey,
    seedTvFocus,
    TV_FOCUS_KEYS,
} from '@/lib/tv-spatial-nav';
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
};

export function useTvOverlayStack({
    controlsEnabled = true,
    settingsOpenFocusKey = TV_FOCUS_KEYS.settingsQrToggle,
    settingsCloseFocusKey = TV_FOCUS_KEYS.ctrlPlayPause,
    idleFocusKey,
}: UseTvOverlayStackOptions = {}) {
    const [controlsVisible, setControlsVisible] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [queueExpanded, setQueueExpanded] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const controlsVisibleRef = useRef(controlsVisible);
    const settingsOpenRef = useRef(settingsOpen);
    const controlsEnabledRef = useRef(controlsEnabled);
    const idleFocusKeyRef = useRef(idleFocusKey);
    controlsVisibleRef.current = controlsVisible;
    settingsOpenRef.current = settingsOpen;
    controlsEnabledRef.current = controlsEnabled;
    idleFocusKeyRef.current = idleFocusKey;

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
        if (settingsOpen) {
            closeSettings();
            return true;
        }

        if (controlsVisible) {
            hideControls();
            return true;
        }

        return false;
    }, [settingsOpen, controlsVisible, closeSettings, hideControls]);

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
            if (isTvBackKey(event.key)) {
                if (handleBack()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                return;
            }

            if (isTvRevealKey(event.key)) {
                if (settingsOpenRef.current) {
                    return;
                }

                // Lobby / idle — spatial nav owns arrows; idle re-seeds QR when focus was lost.
                if (!controlsEnabledRef.current) {
                    if (
                        idleFocusKeyRef.current &&
                        !settingsOpenRef.current &&
                        isTvNavigationKey(event.key)
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
    }, [handleBack, revealControls]);

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
