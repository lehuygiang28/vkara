'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { CuratedRemoteOverlays } from '@/components/curated-playlists/curated-remote-overlays';
import { RemotePanelOverlayProvider } from './remote-panel-overlay-root';
import { RemoteShellSkeleton } from './layout-skeletons';
import { RemoteBottomChrome } from './RemoteBottomChrome';
import { RemoteChromeProvider } from './remote-chrome';
import { RemoteTabKeepAlive } from './RemoteTabKeepAlive';
import { RemoteTabPanel } from './RemoteTabPanel';
import { REMOTE_CHROME_DATASET } from '@/lib/remote-chrome';
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
    const currentTab = useYouTubeStore((state) => state.currentTab);
    const setCurrentTab = useYouTubeStore((state) => state.setCurrentTab);
    const hasPlaying = useYouTubeStore((state) => Boolean(state.room?.playingNow));
    const room = useYouTubeStore((state) => state.room);
    const tvSuppressAutoCreate = useYouTubeStore((state) => state.tvSuppressAutoCreate);
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const showNowPlayingBar = hasPlaying && currentTab !== 'controls';

    const showJoinLobby =
        !room &&
        (effectiveLayoutMode === 'remote' ||
            (effectiveLayoutMode === 'both' && tvSuppressAutoCreate));

    useEffect(() => {
        if (currentTab === 'related') {
            setCurrentTab('search');
        }
    }, [currentTab, setCurrentTab]);

    if (showJoinLobby) {
        return (
            <TooltipProvider delayDuration={400}>
                <div className="flex h-full min-h-0 flex-col">
                    <RemoteJoinLobby allowCreateRoom={effectiveLayoutMode === 'both'} />
                </div>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider delayDuration={400}>
            <RemoteChromeProvider
                mode={REMOTE_CHROME_DATASET.modes.full}
                hasPlaying={hasPlaying}
                showNowPlayingBar={showNowPlayingBar}
            >
                <div className="flex h-full min-h-0 flex-col">
                    <RemotePanelOverlayProvider containOverlays>
                        <RemoteTabPanel>
                            {currentTab === 'search' && <VideoSearch />}
                            {currentTab === 'queue' && <VideoQueue />}
                            {currentTab === 'history' && <VideoHistory />}
                            <RemoteTabKeepAlive
                                active={currentTab === 'controls'}
                                keepMounted={hasPlaying || currentTab === 'controls'}
                                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                            >
                                <PlayerControlsTabs />
                            </RemoteTabKeepAlive>
                            {currentTab === 'settings' && <RoomSettings />}
                        </RemoteTabPanel>
                        <CuratedRemoteOverlays />
                    </RemotePanelOverlayProvider>
                    <RemoteBottomChrome onOpenControls={() => setCurrentTab('controls')} />
                </div>
            </RemoteChromeProvider>
        </TooltipProvider>
    );
}
