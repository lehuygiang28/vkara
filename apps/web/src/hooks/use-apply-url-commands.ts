'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { isExpPast, parseUrlCommands } from '@vkara/url-commands';

import { setUserDisplayName } from '@/lib/device-label';
import { isDedicatedTvRoute } from '@/lib/tv-route';
import { stripLocaleFromPath } from '@/lib/locale-path';
import {
    canApplyMutations,
    canApplySessionPrefs,
    mutationMatchesRoom,
} from '@/lib/url-command-policy';
import { consumeCommandOnce, consumeSessionIntent } from '@/lib/url-command-consume';
import { hydrateVideoById } from '@/lib/url-command-hydrate';
import {
    buildReplacedUrl,
    buildStrippedSearch,
    shouldStripJoinIdentity,
    type UrlStripPhase,
} from '@/lib/url-command-strip';
import { useIsRoomSessionReady } from '@/hooks/use-room-session-ready';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useSearchStore } from '@/store/searchStore';
import { useRoomRejoinSecretStore } from '@/store/roomRejoinSecretStore';
import { useUrlCommandStore } from '@/store/urlCommandStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { ErrorCode } from '@vkara/room';

function isE2eRecoveryPath(pathname: string): boolean {
    const { cleanPath } = stripLocaleFromPath(pathname);
    return cleanPath === '/e2e-recovery' || cleanPath.startsWith('/e2e-recovery/');
}

function replaceSearch(pathname: string, search: string, phases: UrlStripPhase[]) {
    const currentQuery = search ? `?${search}` : '';
    const href = buildReplacedUrl(pathname, buildStrippedSearch(search, phases));
    const current = `${pathname}${currentQuery}`;
    return href === current ? undefined : href;
}

export function useApplyUrlCommands(): void {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.toString();
    const isDedicatedTv = isDedicatedTvRoute(pathname);
    const isRecovery = isE2eRecoveryPath(pathname);
    const sessionReady = useIsRoomSessionReady();
    const liveRoomId = useYouTubeStore((s) => s.room?.id);
    const lastMessage = useWebSocketStore((s) => s.lastMessage);

    const parsed = useMemo(() => parseUrlCommands(search), [search]);

    useLayoutEffect(() => {
        if (isRecovery) {
            return;
        }
        useUrlCommandStore.getState().setSnapshot(parsed);
        const name = parsed.document.name;
        if (name) {
            setUserDisplayName(name);
        }
        if (parsed.document.password) {
            useRoomRejoinSecretStore.getState().stashPendingPassword(parsed.document.password);
        }
    }, [isRecovery, parsed]);

    const snapshot = useUrlCommandStore((s) => s.snapshot);
    const snapshotCreatedAt = useUrlCommandStore((s) => s.createdAt);
    const document = snapshot?.document ?? parsed.document;
    const errorBaselineRef = useRef(lastMessage);

    useEffect(() => {
        errorBaselineRef.current = lastMessage;
        // Intentionally only when a new command snapshot starts.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- lastMessage is the baseline, not a trigger
    }, [snapshotCreatedAt]);

    useEffect(() => {
        if (isRecovery) {
            return;
        }
        const href = replaceSearch(pathname, search, ['secrets']);
        if (href && (searchParams.has('password') || searchParams.has('joinToken'))) {
            router.replace(href);
        }
    }, [isRecovery, pathname, router, search, searchParams]);

    useEffect(() => {
        if (isRecovery || !canApplySessionPrefs(isDedicatedTv)) {
            return;
        }
        if (!snapshot || !consumeSessionIntent(snapshot)) {
            return;
        }
        const { provider, karaoke, q, tab, layoutMode } = document;
        if (provider === 'youtube' || provider === 'tiktok') {
            useAppSettingsStore.getState().setVideoProvider(provider);
        }
        if (karaoke === '0' || karaoke === '1') {
            useSearchStore.getState().setIsKaraoke(karaoke === '1', q);
        } else if (q) {
            void useSearchStore.getState().performSearch(q);
        }
        if (tab) {
            useYouTubeStore.getState().setCurrentTab(tab);
        }
        if (layoutMode === 'auto') {
            useYouTubeStore.getState().enableAutoLayoutMode();
        } else if (layoutMode) {
            useYouTubeStore.getState().setLayoutMode(layoutMode, 'url');
        }
    }, [document, isDedicatedTv, isRecovery, snapshot]);

    const actsStartedFor = useRef<string | null>(null);
    useEffect(() => {
        if (isRecovery) {
            return;
        }
        if (actsStartedFor.current === document.once) {
            return;
        }
        if (!sessionReady || !canApplyMutations(document)) {
            return;
        }
        if (!mutationMatchesRoom(document, liveRoomId)) {
            return;
        }
        if (!document.once || !consumeCommandOnce(document.once)) {
            return;
        }
        actsStartedFor.current = document.once ?? null;

        const send = useWebSocketStore.getState().sendMessage;
        const sendIfFresh = (message: Parameters<typeof send>[0]) => {
            if (isExpPast(document.exp)) {
                return;
            }
            send(message);
        };
        void (async () => {
            if (document.next === '1') {
                sendIfFresh({ type: 'nextVideo' });
            }
            if (document.queue) {
                const video = await hydrateVideoById(document.queue);
                if (video) {
                    sendIfFresh({ type: 'addVideo', video });
                }
            }
            if (document.play) {
                const video = await hydrateVideoById(document.play);
                if (video) {
                    sendIfFresh({ type: 'playNow', video });
                }
            }
        })();
    }, [document, isRecovery, liveRoomId, sessionReady]);

    useEffect(() => {
        if (isRecovery) {
            return;
        }
        const phases: UrlStripPhase[] = [];
        const joinFailed =
            lastMessage != null &&
            lastMessage !== errorBaselineRef.current &&
            lastMessage.type === 'errorWithCode' &&
            (lastMessage.code === ErrorCode.INCORRECT_PASSWORD ||
                lastMessage.code === ErrorCode.ROOM_NOT_FOUND ||
                lastMessage.code === ErrorCode.ROOM_LOCKED);

        if (joinFailed) {
            phases.push('join-failure');
        } else if (
            shouldStripJoinIdentity({
                liveRoomId,
                commandRoomId: document.roomId,
                sessionReady,
            })
        ) {
            phases.push('join-success', 'session', 'one-shot');
            useUrlCommandStore.getState().clearSecrets();
        }

        if (phases.length === 0) {
            return;
        }
        const href = replaceSearch(pathname, search, phases);
        if (href) {
            router.replace(href);
        }
    }, [
        document.roomId,
        isRecovery,
        lastMessage,
        liveRoomId,
        pathname,
        router,
        search,
        sessionReady,
    ]);
}

/** @deprecated Use useApplyUrlCommands — kept as an alias for existing call sites. */
export const useStripRoomQueryFromUrl = useApplyUrlCommands;
