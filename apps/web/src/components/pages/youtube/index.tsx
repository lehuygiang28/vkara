'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { LayoutModeSwitch, RECOVERY_MODE_CHOICES } from '@/components/layout-mode-switch';
import { useLayoutChunkPrefetch, prefetchRemoteShell } from '@/hooks/use-layout-chunk-prefetch';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { useWebSocket } from '@/providers/websocket-provider';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';
import { useTikTokHiddenPlayGuard } from '@/hooks/use-tiktok-hidden-play-guard';
import { useTikTokPhotoIndexSync } from '@/hooks/use-tiktok-photo-index-sync';

import { ConnectionStatusToast } from '@/components/connection-status-toast';
import {
    PlayerColumnSkeleton,
    RemoteShellSkeleton,
} from '@/components/pages/youtube/layout-skeletons';

const PlayerColumn = dynamic(() => import('./PlayerColumn').then((mod) => mod.PlayerColumn), {
    ssr: false,
    loading: () => <PlayerColumnSkeleton />,
});

const RemoteShell = dynamic(() => import('./RemoteShell').then((mod) => mod.RemoteShell), {
    ssr: false,
    loading: () => <RemoteShellSkeleton />,
});

function subscribeFinePointer(callback: () => void) {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}

function getFinePointerSnapshot() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export default function YoutubePlayerPage() {
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const setCurrentTab = useYouTubeStore((s) => s.setCurrentTab);

    const t_Toast = useScopedI18n('toast');
    const [showRemotePanel, setShowRemotePanel] = useState(false);
    const { effectiveLayoutMode, isTvViewport, needsLayoutBootstrap } = useEffectiveLayoutMode();
    const hasFinePointer = useSyncExternalStore(
        subscribeFinePointer,
        getFinePointerSnapshot,
        () => false,
    );
    const prevLayoutMode = useRef(effectiveLayoutMode);

    useStripRoomQueryFromUrl();
    useLayoutChunkPrefetch();

    const { lastMessage } = useWebSocket();
    usePlaybackPositionSync();
    useTikTokHiddenPlayGuard();
    useTikTokPhotoIndexSync();

    const isTvLayout = effectiveLayoutMode !== 'remote';

    useEffect(() => {
        if (!lastMessage) {
            return;
        }
        useYouTubeStore.getState().handleServerMessage(lastMessage, t_Toast, { isTvLayout });
    }, [lastMessage, isTvLayout, t_Toast]);

    useEffect(() => {
        if (effectiveLayoutMode === 'remote' && prevLayoutMode.current !== 'remote') {
            setCurrentTab('search');
        }
        prevLayoutMode.current = effectiveLayoutMode;
    }, [effectiveLayoutMode, setCurrentTab]);

    const openSettingsPanel = () => {
        prefetchRemoteShell();
        setShowRemotePanel(true);
        setCurrentTab('settings');
    };

    const isRemoteOnly = effectiveLayoutMode === 'remote';
    const showsPlayer = effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both';
    const isTvPlayerIdle = Boolean(isTvViewport && showsPlayer && !playingNow);
    const useTvIdleShell = needsLayoutBootstrap || isTvPlayerIdle;

    if (needsLayoutBootstrap) {
        return (
            <div
                className="relative flex h-dvh-screen w-full flex-col overflow-hidden bg-background"
                aria-busy="true"
            >
                <ConnectionStatusToast />
                <div className="pointer-events-auto absolute inset-x-0 bottom-0 border-t border-zinc-800/80 bg-background px-4 py-3 pb-safe-offset">
                    <LayoutModeSwitch
                        tone="overlay-visible"
                        className="w-full"
                        choices={RECOVERY_MODE_CHOICES}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={cn('flex h-dvh-screen w-full flex-col overflow-hidden', 'bg-background')}>
            <ConnectionStatusToast />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full md:flex-row">
                {showsPlayer && (
                    <div
                        className={cn(
                            'relative min-h-0 w-full',
                            useTvIdleShell ? 'bg-background' : 'bg-black',
                            effectiveLayoutMode === 'both' && 'md:h-full md:w-2/3 lg:w-3/4',
                            effectiveLayoutMode === 'player' &&
                                (useTvIdleShell ? 'h-full' : 'h-[42dvh] md:h-full'),
                            isRemoteOnly && 'hidden',
                        )}
                    >
                        <PlayerColumn
                            effectiveLayoutMode={effectiveLayoutMode}
                            isTvViewport={isTvViewport}
                            hasFinePointer={hasFinePointer}
                            onOpenSettingsAction={openSettingsPanel}
                            onSettingsPrefetchAction={prefetchRemoteShell}
                        />
                    </div>
                )}

                {(isRemoteOnly || effectiveLayoutMode === 'both') && (
                    <div
                        className={cn(
                            'flex h-full min-h-0 w-full flex-1 flex-col',
                            effectiveLayoutMode === 'both' && 'md:w-1/3 md:border-l lg:w-1/4',
                            isRemoteOnly &&
                                'mx-auto w-full max-w-md border-border/40 sm:max-w-[26rem] lg:border-x',
                        )}
                    >
                        <RemoteShell />
                    </div>
                )}

                {effectiveLayoutMode === 'player' && showRemotePanel ? (
                    <>
                        <div
                            className="fixed inset-0 z-40 bg-black/60 motion-reduce:bg-black"
                            onClick={() => setShowRemotePanel(false)}
                        />
                        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background pt-safe-offset pr-safe-offset shadow-xl motion-reduce:transition-none animate-in slide-in-from-right duration-300 motion-reduce:animate-none motion-reduce:duration-0">
                            <RemoteShell />
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}
