'use client';

import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';
import { useEffect, useRef } from 'react';

import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
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


export function TvPlayerChrome({
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

    useEffect(() => {
        const becameVisible = visible && !settingsOpen && !wasVisibleRef.current;
        wasVisibleRef.current = visible && !settingsOpen;

        if (becameVisible) {
            focusSelf();
        }
    }, [visible, settingsOpen, focusSelf]);

    return (
        <>
            <div
                className={cn(
                    'absolute inset-0 z-30 transition-opacity duration-300',
                    visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                )}
                aria-hidden={!visible && !settingsOpen}
            >
            <div
                className={cn(
                    'absolute inset-0',
                    settingsOpen ? 'tv-player-scrim tv-player-scrim--settings' : 'tv-player-scrim',
                )}
                aria-hidden
            />

            {!settingsOpen ? (
                <FocusContext.Provider value={focusKey}>
                    <div ref={ref} className="relative flex h-full flex-col">
                        <div className="flex min-h-0 flex-1 flex-col justify-between px-8 pb-4 pt-8 md:px-12 md:pt-10 lg:px-16">
                            <TvPlayerTopBar />

                            <div className="w-full space-y-7 pb-2 md:space-y-8">
                                <TvPlaybackProgress />
                                <TvTransportControls
                                    visible={visible}
                                    settingsOpen={settingsOpen}
                                    onRevealAction={onRevealAction}
                                    onQueueFocusAction={onQueueFocusAction}
                                    onOpenSettingsAction={onOpenSettingsAction}
                                />
                            </div>
                        </div>

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
                                    focusEnabled={visible && !settingsOpen && queueExpanded}
                                    onLeaveQueueAction={onQueueCollapseAction}
                                />
                            </div>
                        </div>
                    </div>
                </FocusContext.Provider>
            ) : null}
            </div>

            {settingsOpen ? (
                <TvSettingsPanel onCloseAction={onCloseSettingsAction} />
            ) : null}
        </>
    );
}
