import type { RawClientMessage } from '@vkara/room';

import { useWebSocketStore } from '@/store/websocketStore';

/** Send over WS without subscribing to React context (avoids re-renders on every message). */
export function ensureConnectedAndSend(messageData: RawClientMessage): void {
    const { connectionStatus, connect, sendMessage } = useWebSocketStore.getState();
    if (connectionStatus !== 'OPEN') {
        connect();
    }
    sendMessage(messageData);
}
