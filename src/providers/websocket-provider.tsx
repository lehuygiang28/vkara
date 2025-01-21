'use client';

import React, { createContext, useContext, useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { noop } from 'framer-motion';

import { isValidRoomId, resolveUrl } from '@/lib/utils';
import type { WebSocketState } from '@/types/websocket.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore, initializeWebSocket } from '@/store/websocketStore';
import { ErrorCode } from '@/types/server-errors.type';

const WebSocketContext = createContext<WebSocketState | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const searchParams = useSearchParams();
    const webSocketStore = useWebSocketStore();
    const { room, setLayoutMode } = useYouTubeStore();

    useLayoutEffect(() => {
        const cleanup = initializeWebSocket({
            url: `${resolveUrl(process.env.NEXT_PUBLIC_API_URL || 'ws://localhost:8000', true)}/ws`,
            reconnectAttempts: Infinity,
            initialRetryDelay: 1000,
            maxRetryDelay: 30000,
            heartbeatInterval: 30000,
        });

        return () => {
            cleanup();
        };
    }, []);

    useLayoutEffect(() => {
        const roomId = searchParams.get('roomId');
        const password = searchParams.get('password');
        const layout = searchParams.get('layoutMode');

        if (!(webSocketStore.connectionStatus === 'OPEN')) {
            noop(1);
        } else if (roomId && isValidRoomId(roomId)) {
            webSocketStore.sendMessage({
                type: 'joinRoom',
                roomId: roomId,
                password: password || undefined,
            });
        } else if (room?.id) {
            webSocketStore.sendMessage({
                type: 'reJoinRoom',
                roomId: room.id,
                password: room?.password,
            });
        } else {
            webSocketStore.sendMessage({ type: 'createRoom' });
        }

        if (layout) {
            if (layout !== 'both' && layout !== 'remote' && layout !== 'player') {
                setLayoutMode('both');
            } else {
                setLayoutMode(layout as 'both' | 'remote' | 'player');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webSocketStore.connectionStatus]);

    useEffect(() => {
        const lastMsg = webSocketStore.lastMessage;
        if (lastMsg?.type === 'errorWithCode' && lastMsg.code === ErrorCode.REJOIN_ROOM_NOT_FOUND) {
            webSocketStore.sendMessage({ type: 'createRoom' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webSocketStore?.lastMessage?.type]);

    return <WebSocketContext.Provider value={webSocketStore}>{children}</WebSocketContext.Provider>;
};
