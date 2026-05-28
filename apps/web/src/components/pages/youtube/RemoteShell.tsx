'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { VideoHistory } from './VideoHistory';
import { VideoQueue } from './VideoQueue';
import { VideoSearch } from './VideoSearch';
import { VideoRelated } from './VideoRelated';
import { PlayerControlsTabs } from './PlayerControlsTabs';
import { RoomSettings } from './RoomSettings';
import { NowPlayingBar } from './NowPlayingBar';
import { MobileBottomNav } from './MobileBottomNav';
import { useYouTubeStore } from '@/store/youtubeStore';

export function RemoteShell() {
    const { currentTab, setCurrentTab } = useYouTubeStore();

    return (
        <TooltipProvider delayDuration={400}>
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {currentTab === 'search' && <VideoSearch />}
                {currentTab === 'queue' && <VideoQueue />}
                {currentTab === 'history' && <VideoHistory />}
                {currentTab === 'related' && <VideoRelated />}
                {currentTab === 'controls' && <PlayerControlsTabs />}
                {currentTab === 'settings' && <RoomSettings />}
            </div>
            <div className="mt-auto shrink-0">
                <NowPlayingBar onOpenQueue={() => setCurrentTab('queue')} />
                <MobileBottomNav />
            </div>
        </div>
        </TooltipProvider>
    );
}
