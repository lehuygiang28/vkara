'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useWebSocketStore, initializeWebSocket } from '@/store/websocketStore';

const WebSocketContext = createContext<ReturnType<typeof useWebSocketStore> | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const webSocketStore = useWebSocketStore();

    useEffect(() => {
        const cleanup = initializeWebSocket(
            process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
        );
        return cleanup;
    }, []);

    return <WebSocketContext.Provider value={webSocketStore}>{children}</WebSocketContext.Provider>;
};
