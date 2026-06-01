'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useLayoutChunkPrefetch, prefetchRemoteShell } from '@/hooks/use-layout-chunk-prefetch';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { useWebSocket } from '@/providers/websocket-provider';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';

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
    const { room, handleServerMessage, setCurrentTab } = useYouTubeStore();

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

    const isTvLayout = effectiveLayoutMode !== 'remote';

    useEffect(() => {
        if (lastMessage) {
            handleServerMessage(lastMessage, t_Toast, { isTvLayout });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage, handleServerMessage, isTvLayout]);

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
    const isTvPlayerIdle = Boolean(isTvViewport && showsPlayer && !room?.playingNow);
    const useTvIdleShell = needsLayoutBootstrap || isTvPlayerIdle;

    if (needsLayoutBootstrap) {
        return (
            <div
                className="relative flex h-dvh-screen w-full flex-col overflow-hidden bg-zinc-950"
                aria-busy="true"
            >
                <ConnectionStatusToast />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex h-dvh-screen w-full flex-col overflow-hidden',
                useTvIdleShell ? 'bg-zinc-950' : 'bg-background',
            )}
        >
            <ConnectionStatusToast />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full md:flex-row">
                {showsPlayer && (
                    <div
                        className={cn(
                            'relative min-h-0 w-full',
                            useTvIdleShell ? 'bg-zinc-950' : 'bg-black',
                            effectiveLayoutMode === 'both' &&
                                !isTvPlayerIdle &&
                                'md:h-full md:w-2/3 lg:w-3/4',
                            effectiveLayoutMode === 'both' && isTvPlayerIdle && 'h-full w-full',
                            effectiveLayoutMode === 'player' && 'h-[42dvh] md:h-full',
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

                {(isRemoteOnly || effectiveLayoutMode === 'both') && !isTvPlayerIdle && (
                    <div
                        className={cn(
                            'flex h-full min-h-0 w-full flex-1 flex-col',
                            effectiveLayoutMode === 'both' && 'md:w-1/3 md:border-l lg:w-1/4',
                            isRemoteOnly && 'mx-auto max-w-lg',
                        )}
                    >
                        <RemoteShell />
                    </div>
                )}

                <AnimatePresence>
                    {effectiveLayoutMode === 'player' && showRemotePanel && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40 bg-black/60"
                                onClick={() => setShowRemotePanel(false)}
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background pt-safe-offset pr-safe-offset shadow-xl"
                            >
                                <RemoteShell />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
