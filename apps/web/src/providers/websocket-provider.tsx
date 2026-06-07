'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { isValidRoomId, resolveWebSocketEndpoint } from '@vkara/room';

import { env } from '@/env';
import { ErrorCode } from '@vkara/room';
import type { WebSocketState } from '@/types/websocket.type';
import { getEffectiveLayoutMode } from '@/lib/layout-mode';
import { captureTvRoomSnapshot, recoverTvRoom } from '@/lib/tv-room-recovery';
import { useIsRoomSessionReady } from '@/hooks/use-room-session-ready';
import { useViewportWidth } from '@/hooks/use-viewport-layout';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore, initializeWebSocket } from '@/store/websocketStore';

interface EnhancedWebSocketState extends WebSocketState {
    ensureConnectedAndSend: WebSocketState['sendMessage'];
    isRoomSessionReady: boolean;
}

const WebSocketContext = createContext<EnhancedWebSocketState | undefined>(undefined);

function getWebSocketUrl(): string {
    const wsEnv = env.NEXT_PUBLIC_WS_URL?.trim();
    if (wsEnv) {
        return resolveWebSocketEndpoint(wsEnv);
    }

    const apiEnv = env.NEXT_PUBLIC_API_URL?.trim();
    if (apiEnv?.startsWith('/')) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${protocol}://${window.location.host}/ws`;
    }

    return resolveWebSocketEndpoint('ws://localhost:8000');
}

export const useWebSocket = (): EnhancedWebSocketState => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const searchParams = useSearchParams();
    const connectionStatus = useWebSocketStore((s) => s.connectionStatus);
    const connectionEpoch = useWebSocketStore((s) => s.connectionEpoch);
    const roomSessionEpoch = useWebSocketStore((s) => s.roomSessionEpoch);
    const lastMessage = useWebSocketStore((s) => s.lastMessage);
    const sendMessage = useWebSocketStore((s) => s.sendMessage);
    const connect = useWebSocketStore((s) => s.connect);
    const disconnect = useWebSocketStore((s) => s.disconnect);
    const forceReconnect = useWebSocketStore((s) => s.forceReconnect);
    const clearRoomScopedMessages = useWebSocketStore((s) => s.clearRoomScopedMessages);
    const clearPendingMessages = useWebSocketStore((s) => s.clearPendingMessages);
    const isMessagePending = useWebSocketStore((s) => s.isMessagePending);
    const getPendingMessages = useWebSocketStore((s) => s.getPendingMessages);

    const roomId = useYouTubeStore((s) => s.room?.id);
    const roomPassword = useYouTubeStore((s) => s.room?.password);
    const layoutMode = useYouTubeStore((s) => s.layoutMode);
    const layoutModeSource = useYouTubeStore((s) => s.layoutModeSource);
    const tvSuppressAutoCreate = useYouTubeStore((s) => s.tvSuppressAutoCreate);
    const setRoom = useYouTubeStore((s) => s.setRoom);
    const enterTvLobby = useYouTubeStore((s) => s.enterTvLobby);
    const viewportWidth = useViewportWidth();

    const wsInitialized = useRef(false);
    const lastSyncedEpoch = useRef(-1);
    const recoveryInFlight = useRef(false);
    const abandonedRoomIdRef = useRef<string | null>(null);

    const roomIdParam = searchParams.get('roomId');
    const passwordParam = searchParams.get('password');
    const hasInviteInUrl = Boolean(roomIdParam && isValidRoomId(roomIdParam));

    const effectiveLayoutMode = getEffectiveLayoutMode({
        storedLayoutMode: layoutMode,
        layoutModeSource,
        viewportWidth,
    });

    const isTvLayout = effectiveLayoutMode !== 'remote';

    const isRoomSessionReady = useIsRoomSessionReady();

    const ensureConnectedAndSend: WebSocketState['sendMessage'] = useCallback(
        (messageData) => {
            if (connectionStatus !== 'OPEN') {
                connect();
            }
            return sendMessage(messageData);
        },
        [connectionStatus, connect, sendMessage],
    );

    const beginTvRecovery = useCallback(
        (snapshotRoom = useYouTubeStore.getState().room) => {
            if (!isTvLayout || recoveryInFlight.current) return false;

            recoveryInFlight.current = true;
            const snapshot = captureTvRoomSnapshot(snapshotRoom);
            if (snapshot) {
                abandonedRoomIdRef.current = snapshot.previousRoomId;
            }

            lastSyncedEpoch.current = -1;
            clearRoomScopedMessages();
            recoverTvRoom(ensureConnectedAndSend, snapshot);
            return true;
        },
        [isTvLayout, clearRoomScopedMessages, ensureConnectedAndSend],
    );

    useEffect(() => {
        if (lastMessage?.type === 'roomJoined' || lastMessage?.type === 'roomCreated') {
            recoveryInFlight.current = false;
            abandonedRoomIdRef.current = null;
            useWebSocketStore.setState({ roomSessionEpoch: connectionEpoch });
        }
    }, [lastMessage, connectionEpoch]);

    useEffect(() => {
        lastSyncedEpoch.current = -1;
    }, [effectiveLayoutMode, hasInviteInUrl]);

    useEffect(() => {
        if (wsInitialized.current) return;

        wsInitialized.current = true;
        const cleanup = initializeWebSocket({
            url: getWebSocketUrl(),
            reconnectAttempts: Infinity,
            initialRetryDelay: 800,
            maxRetryDelay: 20000,
            heartbeatInterval: 25000,
            heartbeatTimeout: 8000,
            messageTimeout: 8000,
        });

        return cleanup;
    }, []);

    const syncRoomSession = useCallback(() => {
        if (connectionStatus !== 'OPEN') return;
        if (lastSyncedEpoch.current === connectionEpoch) return;
        if (recoveryInFlight.current) return;
        lastSyncedEpoch.current = connectionEpoch;

        if (hasInviteInUrl && roomIdParam) {
            ensureConnectedAndSend({
                type: 'joinRoom',
                roomId: roomIdParam,
                password: passwordParam?.trim() || undefined,
            });
            return;
        }

        if (roomId) {
            ensureConnectedAndSend({
                type: 'reJoinRoom',
                roomId,
                password: roomPassword,
            });
            return;
        }

        if (isTvLayout && !tvSuppressAutoCreate) {
            ensureConnectedAndSend({ type: 'createRoom' });
        }
    }, [
        connectionStatus,
        connectionEpoch,
        hasInviteInUrl,
        roomIdParam,
        passwordParam,
        roomId,
        roomPassword,
        isTvLayout,
        tvSuppressAutoCreate,
        ensureConnectedAndSend,
    ]);

    const wakeConnection = useCallback(() => {
        if (document.visibilityState !== 'visible') return;

        lastSyncedEpoch.current = -1;

        if (connectionStatus === 'OPEN') {
            syncRoomSession();
            return;
        }

        forceReconnect();
    }, [connectionStatus, forceReconnect, syncRoomSession]);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                wakeConnection();
            }
        };
        const onOnline = () => wakeConnection();
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                wakeConnection();
            }
        };
        const onFocus = () => wakeConnection();

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('online', onOnline);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('focus', onFocus);

        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('focus', onFocus);
        };
    }, [wakeConnection]);

    useEffect(() => {
        syncRoomSession();
    }, [syncRoomSession]);

    useEffect(() => {
        if (!roomId) {
            lastSyncedEpoch.current = -1;
        }
    }, [roomId]);

    useEffect(() => {
        if (lastMessage?.type === 'roomClosed') {
            lastSyncedEpoch.current = -1;
            if (isTvLayout) {
                enterTvLobby();
            } else {
                setRoom(null);
            }
            return;
        }

        if (
            lastMessage?.type === 'errorWithCode' &&
            lastMessage.code === ErrorCode.NOT_IN_ROOM &&
            roomId
        ) {
            if (recoveryInFlight.current) return;
            if (abandonedRoomIdRef.current === roomId) return;

            lastSyncedEpoch.current = -1;
            ensureConnectedAndSend({
                type: 'reJoinRoom',
                roomId,
                password: roomPassword,
            });
            return;
        }

        if (
            lastMessage?.type === 'errorWithCode' &&
            lastMessage.code === ErrorCode.REJOIN_ROOM_NOT_FOUND
        ) {
            lastSyncedEpoch.current = -1;
            if (isTvLayout) {
                beginTvRecovery(useYouTubeStore.getState().room);
            } else {
                setRoom(null);
            }
        }
    }, [
        lastMessage,
        ensureConnectedAndSend,
        isTvLayout,
        setRoom,
        enterTvLobby,
        roomId,
        roomPassword,
        beginTvRecovery,
    ]);

    const enhancedWebSocketStore = useMemo<EnhancedWebSocketState>(
        () => ({
            sendMessage,
            lastMessage,
            connectionStatus,
            connectionEpoch,
            roomSessionEpoch,
            connect,
            disconnect,
            forceReconnect,
            isMessagePending,
            getPendingMessages,
            clearPendingMessages,
            clearRoomScopedMessages,
            ensureConnectedAndSend,
            isRoomSessionReady,
        }),
        [
            sendMessage,
            lastMessage,
            connectionStatus,
            connectionEpoch,
            roomSessionEpoch,
            connect,
            disconnect,
            forceReconnect,
            isMessagePending,
            getPendingMessages,
            clearPendingMessages,
            clearRoomScopedMessages,
            ensureConnectedAndSend,
            isRoomSessionReady,
        ],
    );

    return (
        <WebSocketContext.Provider value={enhancedWebSocketStore}>
            {children}
        </WebSocketContext.Provider>
    );
};
