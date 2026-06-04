import type { ConnectionStatus, RawClientMessage, ServerMessage } from '@vkara/room';
import type { ClientMessage } from '@vkara/validators/ws/client-message';

export interface WebSocketState {
    sendMessage: (message: RawClientMessage) => void;
    lastMessage: ServerMessage | null;
    connectionStatus: ConnectionStatus;
    connectionEpoch: number;
    roomSessionEpoch: number;
    connect: () => void;
    disconnect: () => void;
    forceReconnect: () => void;
    isMessagePending: (messageId: string) => boolean;
    getPendingMessages: () => ClientMessage[];
    clearPendingMessages: () => void;
    clearRoomScopedMessages: () => void;
}

export interface WebSocketConfig {
    url: string;
    reconnectAttempts?: number;
    initialRetryDelay?: number;
    maxRetryDelay?: number;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    messageTimeout?: number;
}
