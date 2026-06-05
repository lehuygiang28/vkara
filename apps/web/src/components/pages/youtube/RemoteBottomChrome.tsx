'use client';

import { MobileBottomNav } from './MobileBottomNav';
import { NowPlayingBar } from './NowPlayingBar';
import { NowPlayingBarSlot } from './NowPlayingBarSlot';
import { useRemoteChromeContext } from './remote-chrome';

interface RemoteBottomChromeProps {
    onOpenControls: () => void;
}

/** Bottom nav + floating now-playing bar. Layout vars synced by {@link RemoteChromeProvider}. */
export function RemoteBottomChrome({ onOpenControls }: RemoteBottomChromeProps) {
    const {
        hasPlaying,
        showNowPlayingBar,
        navRef,
        panelRef,
        onBarAnimatingChange,
        onBarAnimationComplete,
    } = useRemoteChromeContext();

    return (
        <div className="relative mt-auto shrink-0">
            <MobileBottomNav ref={navRef} />
            {hasPlaying ? (
                <NowPlayingBarSlot
                    ref={panelRef}
                    open={showNowPlayingBar}
                    onAnimatingChange={onBarAnimatingChange}
                    onAnimationComplete={onBarAnimationComplete}
                >
                    <NowPlayingBar onOpenControls={onOpenControls} />
                </NowPlayingBarSlot>
            ) : null}
        </div>
    );
}
