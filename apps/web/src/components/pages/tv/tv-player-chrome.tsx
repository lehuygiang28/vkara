'use client';

import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';
import { memo, useEffect, useRef } from 'react';

import { seedTvFocus, TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { cn } from '@/lib/utils';

import { TvPlayerTopBar } from './tv-player-top-bar';
import { TvPlaybackProgress } from './tv-playback-progress';
import { TvTransportControls } from './tv-transport-controls';
import { TvQueuePanel } from './tv-queue-panel';
import { TvSettingsPanel } from './tv-settings-panel';

type TvPlayerChromeProps = {
    visible: boolean;
    settingsOpen: boolean;
    queueExpanded: boolean;
    onRevealAction: () => void;
    onQueueFocusAction: () => void;
    onQueueCollapseAction: () => void;
    onOpenSettingsAction: () => void;
    onCloseSettingsAction: () => void;
};

function TvPlayerChromeInner({
    visible,
    settingsOpen,
    queueExpanded,
    onRevealAction,
    onQueueFocusAction,
    onQueueCollapseAction,
    onOpenSettingsAction,
    onCloseSettingsAction,
}: TvPlayerChromeProps) {
    const wasVisibleRef = useRef(false);

    const { ref, focusKey, focusSelf } = useFocusable({
        focusKey: TV_FOCUS_KEYS.playerChrome,
        trackChildren: true,
        preferredChildFocusKey: TV_FOCUS_KEYS.ctrlPlayPause,
        focusable: false,
        saveLastFocusedChild: true,
    });

    const showControlsLayer = visible && !settingsOpen;
    const showQueueShelf = showControlsLayer || queueExpanded;

    useEffect(() => {
        const becameVisible = showControlsLayer && !wasVisibleRef.current;
        wasVisibleRef.current = showControlsLayer;

        if (becameVisible) {
            focusSelf();
            seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
        }
    }, [showControlsLayer, focusSelf]);

    return (
        <>
            <div
                className={cn(
                    'tv-fill z-30 transition-opacity duration-300',
                    visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                )}
                aria-hidden={!visible && !settingsOpen}
            >
                <div
                    className={cn(
                        'tv-fill',
                        settingsOpen
                            ? 'tv-player-scrim tv-player-scrim--settings'
                            : 'tv-player-scrim',
                    )}
                    aria-hidden
                />

                {/* Keep chrome (and progress anchor) mounted across settings — hide only. */}
                <FocusContext.Provider value={focusKey}>
                    <div
                        ref={ref}
                        className={cn('relative flex h-full flex-col', settingsOpen && 'hidden')}
                        aria-hidden={settingsOpen || undefined}
                    >
                        <div className="tv-player-chrome__main flex min-h-0 flex-1 flex-col justify-between">
                            {showControlsLayer ? <TvPlayerTopBar /> : null}

                            <div className="tv-player-chrome__stack">
                                <TvPlaybackProgress
                                    enabled={showControlsLayer}
                                    className={showControlsLayer ? undefined : 'hidden'}
                                />
                                <TvTransportControls
                                    visible={showControlsLayer}
                                    settingsOpen={settingsOpen}
                                    onRevealAction={onRevealAction}
                                    onQueueFocusAction={onQueueFocusAction}
                                    onOpenSettingsAction={onOpenSettingsAction}
                                />
                            </div>
                        </div>

                        {showQueueShelf ? (
                            <div
                                className={cn(
                                    'tv-queue-shelf shrink-0',
                                    queueExpanded
                                        ? 'tv-queue-shelf--expanded'
                                        : 'tv-queue-shelf--peek',
                                )}
                            >
                                <div className="tv-queue-shelf__clip">
                                    <TvQueuePanel
                                        embedded
                                        expanded={queueExpanded}
                                        focusEnabled={showControlsLayer && queueExpanded}
                                        onLeaveQueueAction={onQueueCollapseAction}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
                </FocusContext.Provider>
            </div>

            {settingsOpen ? <TvSettingsPanel onCloseAction={onCloseSettingsAction} /> : null}
        </>
    );
}

export const TvPlayerChrome = memo(TvPlayerChromeInner);
