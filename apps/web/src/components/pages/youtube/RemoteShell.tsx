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
import { useRemoteBottomChrome } from '@/hooks/use-remote-bottom-chrome';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useYouTubeStore } from '@/store/youtubeStore';

export function RemoteShell() {
    const { currentTab, room, setCurrentTab } = useYouTubeStore();
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    useRemoteBottomChrome(Boolean(room?.playingNow));

    useEffect(() => {
        if (currentTab === 'related') {
            setCurrentTab('search');
        }
    }, [currentTab, setCurrentTab]);

    const showJoinLobby = effectiveLayoutMode === 'remote' && !room;

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
                <RemoteTabPanel>
                    {currentTab === 'search' && <VideoSearch />}
                    {currentTab === 'queue' && <VideoQueue />}
                    {currentTab === 'history' && <VideoHistory />}
                    {currentTab === 'controls' && <PlayerControlsTabs />}
                    {currentTab === 'settings' && <RoomSettings />}
                </RemoteTabPanel>
                <div className="mt-auto shrink-0">
                    <NowPlayingBar onOpenQueue={() => setCurrentTab('queue')} />
                    <MobileBottomNav />
                </div>
            </div>
        </TooltipProvider>
    );
}
