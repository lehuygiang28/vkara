'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { NowPlayingBar } from './NowPlayingBar';
import { MobileBottomNav } from './MobileBottomNav';
import { RemoteTabPanel } from './RemoteTabPanel';
import { RemotePanelOverlayProvider } from './remote-panel-overlay-root';
import { RemoteShellSkeleton } from './layout-skeletons';
import { useRemoteBottomChrome } from '@/hooks/use-remote-bottom-chrome';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useYouTubeStore } from '@/store/youtubeStore';

const VideoSearch = dynamic(() => import('./VideoSearch').then((mod) => mod.VideoSearch), {
    loading: () => <RemoteShellSkeleton className="min-h-0 flex-1" />,
});

const VideoQueue = dynamic(() => import('./VideoQueue').then((mod) => mod.VideoQueue), {
    loading: () => <RemoteShellSkeleton className="min-h-0 flex-1" />,
});

const VideoHistory = dynamic(() => import('./VideoHistory').then((mod) => mod.VideoHistory), {
    loading: () => <RemoteShellSkeleton className="min-h-0 flex-1" />,
});

const PlayerControlsTabs = dynamic(
    () => import('./PlayerControlsTabs').then((mod) => mod.PlayerControlsTabs),
    { loading: () => <RemoteShellSkeleton className="min-h-0 flex-1" /> },
);

const RoomSettings = dynamic(() => import('./RoomSettings').then((mod) => mod.RoomSettings), {
    loading: () => <RemoteShellSkeleton className="min-h-0 flex-1" />,
});

const RemoteJoinLobby = dynamic(
    () => import('./RemoteJoinLobby').then((mod) => mod.RemoteJoinLobby),
    { loading: () => <RemoteShellSkeleton className="min-h-0 flex-1" /> },
);

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
                    <NowPlayingBar onOpenControls={() => setCurrentTab('controls')} />
                    <MobileBottomNav />
                </div>
            </div>
        </TooltipProvider>
    );
}
