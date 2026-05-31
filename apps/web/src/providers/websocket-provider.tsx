'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { isValidRoomId, resolveUrl } from '@vkara/shared-utils';
import type { WebSocketState } from '@/types/websocket.type';
import { getEffectiveLayoutMode } from '@/lib/layout-mode';
import { useIsRoomSessionReady } from '@/hooks/use-room-session-ready';
import { useViewportWidth } from '@/hooks/use-viewport-layout';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore, initializeWebSocket } from '@/store/websocketStore';
import { ErrorCode } from '@vkara/shared-types';

interface EnhancedWebSocketState extends WebSocketState {
    ensureConnectedAndSend: WebSocketState['sendMessage'];
    isRoomSessionReady: boolean;
}

const WebSocketContext = createContext<EnhancedWebSocketState | undefined>(undefined);

function getWebSocketUrl(): string {
    const wsEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
    if (wsEnv) {
        return `${resolveUrl(wsEnv, true)}/ws`;
    }

    const apiEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (apiEnv?.startsWith('/')) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${protocol}://${window.location.host}/ws`;
    }

    return `${resolveUrl('ws://localhost:8000', true)}/ws`;
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
    const isMessagePending = useWebSocketStore((s) => s.isMessagePending);
    const getPendingMessages = useWebSocketStore((s) => s.getPendingMessages);

    const { room, layoutMode, layoutModeSource, setRoom } = useYouTubeStore();
    const viewportWidth = useViewportWidth();

    const wsInitialized = useRef(false);
    const lastSyncedEpoch = useRef(-1);

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

    useEffect(() => {
        if (
            lastMessage?.type === 'roomJoined' ||
            lastMessage?.type === 'roomCreated'
        ) {
            useWebSocketStore.setState({ roomSessionEpoch: connectionEpoch });
        }
    }, [lastMessage, connectionEpoch]);

    useEffect(() => {
        if (connectionStatus !== 'OPEN') return;
        if (!room?.id && isTvLayout) {
            useWebSocketStore.setState({ roomSessionEpoch: connectionEpoch });
        }
    }, [connectionStatus, connectionEpoch, room?.id, isTvLayout]);

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

    const ensureConnectedAndSend: WebSocketState['sendMessage'] = useCallback(
        (messageData) => {
            if (connectionStatus !== 'OPEN') {
                connect();
            }
            return sendMessage(messageData);
        },
        [connectionStatus, connect, sendMessage],
    );

    const syncRoomSession = useCallback(() => {
        if (connectionStatus !== 'OPEN') return;
        if (lastSyncedEpoch.current === connectionEpoch) return;
        lastSyncedEpoch.current = connectionEpoch;

        if (hasInviteInUrl && roomIdParam) {
            ensureConnectedAndSend({
                type: 'joinRoom',
                roomId: roomIdParam,
                password: passwordParam?.trim() || undefined,
            });
            return;
        }

        if (room?.id) {
            ensureConnectedAndSend({
                type: 'reJoinRoom',
                roomId: room.id,
                password: room.password,
            });
            return;
        }

        if (isTvLayout) {
            ensureConnectedAndSend({ type: 'createRoom' });
        }
    }, [
        connectionStatus,
        connectionEpoch,
        hasInviteInUrl,
        roomIdParam,
        passwordParam,
        room?.id,
        room?.password,
        isTvLayout,
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
        if (!room?.id) {
            lastSyncedEpoch.current = -1;
        }
    }, [room?.id]);

    useEffect(() => {
        if (
            lastMessage?.type === 'errorWithCode' &&
            lastMessage.code === ErrorCode.NOT_IN_ROOM &&
            room?.id
        ) {
            lastSyncedEpoch.current = -1;
            ensureConnectedAndSend({
                type: 'reJoinRoom',
                roomId: room.id,
                password: room.password,
            });
            return;
        }

        if (
            lastMessage?.type === 'errorWithCode' &&
            lastMessage.code === ErrorCode.REJOIN_ROOM_NOT_FOUND
        ) {
            lastSyncedEpoch.current = -1;
            setRoom(null);
            if (isTvLayout) {
                ensureConnectedAndSend({ type: 'createRoom' });
            }
        }
    }, [lastMessage, ensureConnectedAndSend, isTvLayout, setRoom, room?.id, room?.password]);

    const enhancedWebSocketStore: EnhancedWebSocketState = {
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
        ensureConnectedAndSend,
        isRoomSessionReady,
    };

    return (
        <WebSocketContext.Provider value={enhancedWebSocketStore}>
            {children}
        </WebSocketContext.Provider>
    );
};
