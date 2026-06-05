'use client';

import { useEffect, useRef, useState } from 'react';

import { useRemoteBottomChrome } from '@/hooks/use-remote-bottom-chrome';

import { MobileBottomNav } from './MobileBottomNav';
import { NowPlayingBar } from './NowPlayingBar';
import { NowPlayingBarSlot } from './NowPlayingBarSlot';

interface RemoteBottomChromeProps {
    hasPlaying: boolean;
    showNowPlayingBar: boolean;
    onOpenControls: () => void;
}

/**
 * Bottom nav + floating now-playing bar. Syncs layout CSS vars until close animation finishes.
 */
export function RemoteBottomChrome({
    hasPlaying,
    showNowPlayingBar,
    onOpenControls,
}: RemoteBottomChromeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [layoutNowPlayingVisible, setLayoutNowPlayingVisible] = useState(showNowPlayingBar);

    useEffect(() => {
        if (showNowPlayingBar) {
            setLayoutNowPlayingVisible(true);
        }
    }, [showNowPlayingBar]);

    useRemoteBottomChrome(containerRef, { nowPlayingVisible: layoutNowPlayingVisible });

    return (
        <div ref={containerRef} className="relative mt-auto shrink-0">
            <MobileBottomNav />
            {hasPlaying ? (
                <NowPlayingBarSlot
                    open={showNowPlayingBar}
                    onAnimationComplete={(open) => {
                        if (!open) {
                            setLayoutNowPlayingVisible(false);
                        }
                    }}
                >
                    <NowPlayingBar onOpenControls={onOpenControls} />
                </NowPlayingBarSlot>
            ) : null}
        </div>
    );
}
