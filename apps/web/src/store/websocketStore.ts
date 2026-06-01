import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
    ClientMessage,
    ConnectionStatus,
    MessageBase,
    ServerMessage,
} from '@vkara/shared-types';
import type { WebSocketConfig, WebSocketState } from '@/types/websocket.type';

class WebSocketManager {
    private static instance: WebSocketManager | null = null;
    private socket: WebSocket | null = null;
    private messageQueue: Map<
        string,
        {
            message: ClientMessage;
            timestamp: number;
            retries: number;
        }
    > = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number;
    private retryDelay: number;
    private initialRetryDelay: number;
    private maxRetryDelay: number;
    private messageTimeout: number;
    private heartbeatIntervalMs: number;
    private heartbeatTimeoutMs: number;
    private timeoutCheckerInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private heartbeatTimeout: NodeJS.Timeout | null = null;
    private url: string;
    private reconnecting: boolean = false;
    private intentionalClose: boolean = false;
    private lastConnectionTime: number = 0;

    private constructor(config: WebSocketConfig) {
        this.url = config.url;
        this.maxReconnectAttempts = config.reconnectAttempts ?? Infinity;
        this.initialRetryDelay = config.initialRetryDelay ?? 1000;
        this.retryDelay = this.initialRetryDelay;
        this.maxRetryDelay = config.maxRetryDelay ?? 30000;
        this.messageTimeout = config.messageTimeout ?? 5000;
        this.heartbeatIntervalMs = config.heartbeatInterval ?? 25000;
        this.heartbeatTimeoutMs = config.heartbeatTimeout ?? 8000;
        this.startTimeoutChecker();
    }

    public static getInstance(config?: WebSocketConfig): WebSocketManager {
        if (!WebSocketManager.instance && config) {
            WebSocketManager.instance = new WebSocketManager(config);
        } else if (!WebSocketManager.instance) {
            throw new Error('WebSocketManager must be initialized with config first');
        }
        return WebSocketManager.instance;
    }

    public static destroyInstance(): void {
        if (WebSocketManager.instance) {
            WebSocketManager.instance.cleanup();
            WebSocketManager.instance = null;
        }
    }

    private bumpConnectionEpoch = () => {
        useWebSocketStore.setState((state) => ({
            connectionEpoch: state.connectionEpoch + 1,
        }));
    };

    private startTimeoutChecker = () => {
        this.timeoutCheckerInterval = setInterval(() => {
            const now = Date.now();
            for (const [messageId, { message, timestamp, retries }] of this.messageQueue) {
                if (message.type === 'ping') {
                    this.messageQueue.delete(messageId);
                    continue;
                }
                if (now - timestamp > this.messageTimeout) {
                    if (retries < 3) {
                        this.messageQueue.set(messageId, {
                            message,
                            timestamp: now,
                            retries: retries + 1,
                        });
                        this.sendMessageToServer(message);
                    } else {
                        this.messageQueue.delete(messageId);
                    }
                }
            }
        }, 1000);
    };

    private cleanup = () => {
        this.intentionalClose = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.timeoutCheckerInterval) {
            clearInterval(this.timeoutCheckerInterval);
            this.timeoutCheckerInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.reconnecting = false;
    };

    private setStatus = (status: ConnectionStatus) => {
        useWebSocketStore.setState({ connectionStatus: status });
    };

    private handleOpen = () => {
        this.reconnectAttempts = 0;
        this.retryDelay = this.initialRetryDelay;
        this.reconnecting = false;
        this.intentionalClose = false;
        this.lastConnectionTime = Date.now();
        this.setStatus('OPEN');
        this.bumpConnectionEpoch();
        this.clearPendingMessages();
        this.startHeartbeat();
    };

    private handleClose = () => {
        this.setStatus('CLOSED');
        this.cleanupSocket();
        if (!this.intentionalClose) {
            this.scheduleReconnect();
        }
    };

    private cleanupSocket = () => {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onmessage = null;
            try {
                this.socket.close();
            } catch {
                /* already closed */
            }
            this.socket = null;
        }
    };

    private handleError = () => {
        this.cleanupSocket();
        if (!this.intentionalClose) {
            this.scheduleReconnect();
        }
    };

    private handleMessage = (event: MessageEvent) => {
        try {
            const message: ServerMessage = JSON.parse(event.data);

            if (message.type === 'pong') {
                if (this.heartbeatTimeout) {
                    clearTimeout(this.heartbeatTimeout);
                    this.heartbeatTimeout = null;
                }
                return;
            }

            if (message.type === 'ack') {
                this.messageQueue.delete(message.messageId);
                return;
            }

            useWebSocketStore.setState({ lastMessage: message });
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    private scheduleReconnect = () => {
        if (this.reconnecting || this.intentionalClose) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnecting = true;
        this.setStatus('CONNECTING');

        const timeSinceLastConnection = Date.now() - this.lastConnectionTime;
        const isRecentDisconnect = timeSinceLastConnection < 15000;

        const reconnectDelay = isRecentDisconnect
            ? Math.min(400, this.retryDelay)
            : this.retryDelay;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.reconnectAttempts++;
            this.retryDelay = Math.min(this.retryDelay * 1.5, this.maxRetryDelay);
            this.reconnecting = false;
            this.connect();
        }, reconnectDelay);
    };

    private sendHeartbeat = () => {
        if (this.socket?.readyState !== WebSocket.OPEN) return;

        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
        }

        try {
            this.socket.send(
                JSON.stringify({
                    type: 'ping',
                    id: `heartbeat-${Date.now()}`,
                    timestamp: Date.now(),
                }),
            );
        } catch (error) {
            console.error('Heartbeat send failed:', error);
            this.forceReconnect();
            return;
        }

        this.heartbeatTimeout = setTimeout(() => {
            console.warn('Heartbeat timeout - reconnecting...');
            this.forceReconnect();
        }, this.heartbeatTimeoutMs);
    };

    private startHeartbeat = () => {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.sendHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.heartbeatIntervalMs);
    };

    private sendMessageToServer = (message: ClientMessage) => {
        if (this.socket?.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message:', error);
                this.scheduleReconnect();
            }
        }
    };

    sendMessage = <T extends ClientMessage['type']>(
        messageData: Omit<Extract<ClientMessage, { type: T }>, keyof MessageBase>,
    ): string => {
        const message = {
            id: uuid(),
            timestamp: Date.now(),
            requiresAck: true,
            ...messageData,
        } as ClientMessage;

        if (message.type === 'ping') {
            this.sendMessageToServer(message);
            return message.id;
        }

        this.messageQueue.set(message.id, {
            message,
            timestamp: Date.now(),
            retries: 0,
        });

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.sendMessageToServer(message);
        } else if (this.socket?.readyState !== WebSocket.CONNECTING) {
            this.connect();
        }

        return message.id;
    };

    isMessagePending = (messageId: string): boolean => {
        return this.messageQueue.has(messageId);
    };

    getPendingMessages = (): ClientMessage[] => {
        return Array.from(this.messageQueue.values()).map(({ message }) => message);
    };

    clearPendingMessages = () => {
        this.messageQueue.clear();
    };

    clearRoomScopedMessages = () => {
        const sessionTypes = new Set<ClientMessage['type']>([
            'ping',
            'createRoom',
            'joinRoom',
            'reJoinRoom',
            'leaveRoom',
        ]);

        for (const [messageId, { message }] of this.messageQueue) {
            if (!sessionTypes.has(message.type)) {
                this.messageQueue.delete(messageId);
            }
        }
    };

    forceReconnect = () => {
        this.intentionalClose = false;
        this.reconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.reconnectAttempts = 0;
        this.retryDelay = this.initialRetryDelay;
        this.cleanupSocket();
        this.connect();
    };

    connect = () => {
        if (this.socket?.readyState === WebSocket.OPEN) return;
        if (this.socket?.readyState === WebSocket.CONNECTING) return;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.intentionalClose = false;

        try {
            this.cleanupSocket();
            this.socket = new WebSocket(this.url);
            this.setStatus('CONNECTING');

            this.socket.onopen = this.handleOpen;
            this.socket.onclose = this.handleClose;
            this.socket.onerror = this.handleError;
            this.socket.onmessage = this.handleMessage;
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    };

    disconnect = () => {
        this.intentionalClose = true;
        this.reconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.cleanupSocket();
        this.setStatus('CLOSED');
    };
}

export const useWebSocketStore = create<WebSocketState>(() => ({
    sendMessage: (() => {
        console.error('WebSocket not initialized');
        return '';
    }) as WebSocketState['sendMessage'],
    lastMessage: null,
    connectionStatus: 'CLOSED',
    connectionEpoch: 0,
    roomSessionEpoch: 0,
    connect: () => {
        console.error('WebSocket not initialized');
    },
    disconnect: () => {
        console.error('WebSocket not initialized');
    },
    forceReconnect: () => {
        console.error('WebSocket not initialized');
    },
    isMessagePending: () => false,
    getPendingMessages: () => [],
    clearPendingMessages: () => {
        console.error('WebSocket not initialized');
    },
    clearRoomScopedMessages: () => {
        console.error('WebSocket not initialized');
    },
}));

export const initializeWebSocket = (config: WebSocketConfig) => {
    const wsManager = WebSocketManager.getInstance(config);

    useWebSocketStore.setState({
        sendMessage: wsManager.sendMessage,
        connect: wsManager.connect,
        disconnect: wsManager.disconnect,
        forceReconnect: wsManager.forceReconnect,
        isMessagePending: wsManager.isMessagePending,
        getPendingMessages: wsManager.getPendingMessages,
        clearPendingMessages: wsManager.clearPendingMessages,
        clearRoomScopedMessages: wsManager.clearRoomScopedMessages,
    });

    wsManager.connect();

    return () => {
        WebSocketManager.destroyInstance();
    };
};
