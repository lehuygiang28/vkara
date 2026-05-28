'use client';

import { useCallback } from 'react';

import { useWebSocketStore } from '@/store/websocketStore';
import { useYouTubeStore } from '@/store/youtubeStore';

export function useIsRoomSessionReady(): boolean {
    const connectionStatus = useWebSocketStore((s) => s.connectionStatus);
    const connectionEpoch = useWebSocketStore((s) => s.connectionEpoch);
    const roomSessionEpoch = useWebSocketStore((s) => s.roomSessionEpoch);
    const roomId = useYouTubeStore((s) => s.room?.id);

    return (
        connectionStatus === 'OPEN' && (!roomId || roomSessionEpoch === connectionEpoch)
    );
}

export function useWaitForRoomSession() {
    return useCallback(async (timeoutMs = 8000): Promise<boolean> => {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            const { connectionStatus, connectionEpoch, roomSessionEpoch } =
                useWebSocketStore.getState();
            const roomId = useYouTubeStore.getState().room?.id;

            if (
                connectionStatus === 'OPEN' &&
                (!roomId || roomSessionEpoch === connectionEpoch)
            ) {
                return true;
            }

            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        return false;
    }, []);
}
