'use client';

import { useEffect } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { VideoHistory } from './VideoHistory';
import { VideoQueue } from './VideoQueue';
import { VideoSearch } from './VideoSearch';
import { PlayerControlsTabs } from './PlayerControlsTabs';
import { RoomSettings } from './RoomSettings';
import { NowPlayingBar } from './NowPlayingBar';
import { MobileBottomNav } from './MobileBottomNav';
import { RemoteJoinLobby } from './RemoteJoinLobby';
import { RemoteTabPanel } from './RemoteTabPanel';
import { RemotePanelOverlayProvider } from './remote-panel-overlay-root';
import { useRemoteBottomChrome } from '@/hooks/use-remote-bottom-chrome';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useYouTubeStore } from '@/store/youtubeStore';

export function RemoteShell() {
    const { currentTab, room, setCurrentTab } = useYouTubeStore();
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    useRemoteBottomChrome(Boolean(room?.playingNow));

    const showJoinLobby = effectiveLayoutMode === 'remote' && !room;
    const containOverlays = effectiveLayoutMode !== 'remote';

    useEffect(() => {
        if (currentTab === 'related') {
            setCurrentTab('search');
        }
    }, [currentTab, setCurrentTab]);

    useEffect(() => {
        const root = document.documentElement;
        if (showJoinLobby) {
            root.dataset.vkaraRemoteChrome = 'none';
        } else {
            root.dataset.vkaraRemoteChrome = 'full';
        }
        return () => {
            delete root.dataset.vkaraRemoteChrome;
        };
    }, [showJoinLobby]);

    if (showJoinLobby) {
        return (
            <TooltipProvider delayDuration={400}>
                <div className="flex h-full min-h-0 flex-col">
                    <RemoteJoinLobby />
                </div>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider delayDuration={400}>
            <div className="flex h-full min-h-0 flex-col">
                <RemotePanelOverlayProvider containOverlays={containOverlays}>
                    <RemoteTabPanel>
                        {currentTab === 'search' && <VideoSearch />}
                        {currentTab === 'queue' && <VideoQueue />}
                        {currentTab === 'history' && <VideoHistory />}
                        {currentTab === 'controls' && <PlayerControlsTabs />}
                        {currentTab === 'settings' && <RoomSettings />}
                    </RemoteTabPanel>
                </RemotePanelOverlayProvider>
                <div className="mt-auto shrink-0">
                    <NowPlayingBar onOpenQueue={() => setCurrentTab('queue')} />
                    <MobileBottomNav />
                </div>
            </div>
        </TooltipProvider>
    );
}
