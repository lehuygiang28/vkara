import type {
    ClientMessage,
    ConnectionStatus,
    RawClientMessage,
    ServerMessage,
} from '@vkara/shared-types';

export type {
    ClientMessage,
    ConnectionStatus,
    MessageBase,
    RawClientMessage,
    Room,
    ServerMessage,
} from '@vkara/shared-types';

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
