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
    connect: () => void;
    disconnect: () => void;
    isMessagePending: (messageId: string) => boolean;
    getPendingMessages: () => ClientMessage[];
}

export interface WebSocketConfig {
    url: string;
    reconnectAttempts?: number;
    initialRetryDelay?: number;
    maxRetryDelay?: number;
    heartbeatInterval?: number;
    messageTimeout?: number;
}
