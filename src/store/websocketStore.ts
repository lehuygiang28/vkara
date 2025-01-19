import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
    WebSocketState,
    ClientMessage,
    ServerMessage,
    WebSocketConfig,
    ConnectionStatus,
    MessageBase,
} from '@/types/websocket.type';

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
    private timeoutCheckerInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private heartbeatTimeout: NodeJS.Timeout | null = null;
    private url: string;

    private constructor(config: WebSocketConfig) {
        this.url = config.url;
        this.maxReconnectAttempts = config.reconnectAttempts ?? Infinity;
        this.initialRetryDelay = config.initialRetryDelay ?? 1000;
        this.retryDelay = this.initialRetryDelay;
        this.maxRetryDelay = config.maxRetryDelay ?? 30000;
        this.messageTimeout = config.messageTimeout ?? 5000;
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

    private startTimeoutChecker = () => {
        this.timeoutCheckerInterval = setInterval(() => {
            const now = Date.now();
            for (const [messageId, { message, timestamp, retries }] of this.messageQueue) {
                if (now - timestamp > this.messageTimeout) {
                    if (retries < 3) {
                        // Retry the message
                        this.messageQueue.set(messageId, {
                            message,
                            timestamp: now,
                            retries: retries + 1,
                        });
                        this.sendMessageToServer(message);
                    } else {
                        // Message failed after 3 retries
                        this.messageQueue.delete(messageId);
                    }
                }
            }
        }, 1000);
    };

    private cleanup = () => {
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
        this.messageQueue.clear();
    };

    private setStatus = (status: ConnectionStatus) => {
        useWebSocketStore.setState({ connectionStatus: status });
    };

    private handleOpen = () => {
        this.reconnectAttempts = 0;
        this.retryDelay = this.initialRetryDelay;
        this.setStatus('OPEN');

        // Resend all pending messages
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_, { message }] of this.messageQueue) {
            this.sendMessageToServer(message);
        }
        this.startHeartbeat();
    };

    private handleClose = () => {
        this.setStatus('CLOSED');
        this.cleanup();
        this.scheduleReconnect();
    };

    private handleError = (error: Event) => {
        console.error('WebSocket error:', error);
        this.cleanup();
        this.scheduleReconnect();
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
                // Remove acknowledged message from queue
                this.messageQueue.delete(message.messageId);
                return;
            }

            useWebSocketStore.setState({ lastMessage: message });
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    private scheduleReconnect = () => {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.retryDelay = Math.min(this.retryDelay * 1.5, this.maxRetryDelay);
            this.connect();
        }, this.retryDelay);
    };

    private startHeartbeat = () => {
        this.heartbeatInterval = setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                const now = Date.now();
                const heartbeatMessage: ClientMessage = {
                    type: 'ping',
                    id: `heartbeat-${now}`,
                    timestamp: now,
                };

                this.socket.send(JSON.stringify(heartbeatMessage));

                this.heartbeatTimeout = setTimeout(() => {
                    console.warn('Heartbeat timeout - reconnecting...');
                    this.cleanup();
                    this.connect();
                }, 5000);
            }
        }, 30000);
    };

    private sendMessageToServer = (message: ClientMessage) => {
        if (this.socket?.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    sendMessage = <T extends ClientMessage['type']>(
        messageData: Omit<Extract<ClientMessage, { type: T }>, keyof MessageBase>,
    ): string => {
        const message = {
            id: uuid(),
            timestamp: Date.now(),
            ...messageData,
        } as ClientMessage;

        // Add to queue first
        this.messageQueue.set(message.id, {
            message,
            timestamp: Date.now(),
            retries: 0,
        });

        // Try to send immediately if connected
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.sendMessageToServer(message);
        } else {
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

    connect = () => {
        if (this.socket?.readyState === WebSocket.OPEN) return;

        try {
            this.socket = new WebSocket(this.url);
            this.setStatus('CONNECTING');

            this.socket.onopen = this.handleOpen;
            this.socket.onclose = this.handleClose;
            this.socket.onerror = this.handleError;
            this.socket.onmessage = this.handleMessage;
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleError(error as Event);
        }
    };

    disconnect = () => {
        this.cleanup();
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
    connect: () => {
        console.error('WebSocket not initialized');
    },
    disconnect: () => {
        console.error('WebSocket not initialized');
    },
    isMessagePending: () => false,
    getPendingMessages: () => [],
}));

export const initializeWebSocket = (config: WebSocketConfig) => {
    const wsManager = WebSocketManager.getInstance(config);

    useWebSocketStore.setState({
        sendMessage: wsManager.sendMessage,
        connect: wsManager.connect,
        disconnect: wsManager.disconnect,
        isMessagePending: wsManager.isMessagePending,
        getPendingMessages: wsManager.getPendingMessages,
    });

    wsManager.connect();

    return () => {
        WebSocketManager.destroyInstance();
    };
};
