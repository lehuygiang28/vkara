'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import { isValidRoomId, resolveUrl } from '@/lib/utils';
import type { WebSocketState } from '@/types/websocket.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore, initializeWebSocket } from '@/store/websocketStore';
import { ErrorCode } from '@/types/server-errors.type';

const WebSocketContext = createContext<WebSocketState | undefined>(undefined);

export const useWebSocket = (): WebSocketState => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const searchParams = useSearchParams();
    const webSocketStore = useWebSocketStore();
    const { room, layoutMode, setLayoutMode } = useYouTubeStore();

    // Refs to prevent duplicated actions
    const wsInitialized = useRef(false);
    const joinedRoomId = useRef<string | null>(null);
    const attemptedJoin = useRef(false);

    // Stable references to URL params to avoid dependency issues
    const roomIdParam = searchParams.get('roomId');
    const passwordParam = searchParams.get('password');
    const layoutParam = searchParams.get('layoutMode');

    // Initialize WebSocket connection once
    useEffect(() => {
        if (wsInitialized.current) return;

        wsInitialized.current = true;
        const cleanup = initializeWebSocket({
            url: `${resolveUrl(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000', true)}/ws`,
            reconnectAttempts: Infinity,
            initialRetryDelay: 1000,
            maxRetryDelay: 30000,
            heartbeatInterval: 30000,
        });

        return cleanup;
    }, []);

    // Handle layout mode from URL params
    useEffect(() => {
        if (!layoutParam) return;

        if (layoutParam !== 'both' && layoutParam !== 'remote' && layoutParam !== 'player') {
            setLayoutMode('both');
        } else {
            setLayoutMode(layoutParam as 'both' | 'remote' | 'player');
        }
    }, [layoutParam, setLayoutMode]);

    // Handle connection changes and room management
    useEffect(() => {
        // Only proceed when connection is open
        if (webSocketStore.connectionStatus !== 'OPEN') {
            return;
        }

        // Reset attempt flag when connection opens
        if (webSocketStore.connectionStatus === 'OPEN') {
            attemptedJoin.current = false;
        }

        // Don't attempt joining if we've already tried
        if (attemptedJoin.current) {
            return;
        }

        attemptedJoin.current = true;

        // Join from URL params
        if (roomIdParam && isValidRoomId(roomIdParam) && joinedRoomId.current !== roomIdParam) {
            joinedRoomId.current = roomIdParam;
            webSocketStore.sendMessage({
                type: 'joinRoom',
                roomId: roomIdParam,
                password: passwordParam || undefined,
            });
            return;
        }

        // Rejoin existing room
        if (room?.id && !joinedRoomId.current) {
            joinedRoomId.current = room.id;
            webSocketStore.sendMessage({
                type: 'reJoinRoom',
                roomId: room.id,
                password: room.password,
            });
            return;
        }

        // Create new room if needed
        if (!joinedRoomId.current && layoutMode !== 'remote' && layoutParam !== 'remote') {
            webSocketStore.sendMessage({ type: 'createRoom' });
        }
    }, [
        webSocketStore.connectionStatus,
        roomIdParam,
        passwordParam,
        room?.id,
        room?.password,
        layoutMode,
        layoutParam,
        webSocketStore,
    ]);

    // Reset room tracking when we leave a room
    useEffect(() => {
        if (!room?.id && joinedRoomId.current) {
            joinedRoomId.current = null;
            attemptedJoin.current = false;
        }
    }, [room?.id]);

    // Handle error messages from server
    useEffect(() => {
        const lastMsg = webSocketStore.lastMessage;
        if (lastMsg?.type === 'errorWithCode' && lastMsg.code === ErrorCode.REJOIN_ROOM_NOT_FOUND) {
            joinedRoomId.current = null;
            attemptedJoin.current = false;
            webSocketStore.sendMessage({ type: 'createRoom' });
        }
    }, [webSocketStore.lastMessage?.type, webSocketStore]);

    return <WebSocketContext.Provider value={webSocketStore}>{children}</WebSocketContext.Provider>;
};
