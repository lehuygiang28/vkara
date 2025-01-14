'use client';

import React, { createContext, useContext, useLayoutEffect } from 'react';
import { useWebSocketStore, initializeWebSocket } from '@/store/websocketStore';
import type { WebSocketState } from '@/types/websocket.type';
import { useYouTubeStore } from '@/store/youtubeStore';

const WebSocketContext = createContext<WebSocketState | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const webSocketStore = useWebSocketStore();
    const { room } = useYouTubeStore();

    useLayoutEffect(() => {
        const cleanup = initializeWebSocket({
            url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
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
        if (room?.id && webSocketStore.connectionStatus === 'OPEN') {
            webSocketStore.sendMessage({
                type: 'joinRoom',
                roomId: room.id,
                password: room?.password,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room?.id, webSocketStore?.connectionStatus]);

    return <WebSocketContext.Provider value={webSocketStore}>{children}</WebSocketContext.Provider>;
};
