import { YouTubeVideo } from './youtube.type';

export interface Room {
    id: string;
    password?: string;
    clients: string[];
    videoQueue: YouTubeVideo[];
    historyQueue: YouTubeVideo[];
    volume: number;
    playingNow: YouTubeVideo | null;
    lastActivity: number;
    creatorId: string;
    isPlaying: boolean;
    currentTime: number;
}

export interface MessageBase {
    id: string;
    timestamp: number;
}

export type RawClientMessage = {
    requiresAck?: boolean;
} & (
    | { type: 'ping' }
    | { type: 'createRoom'; password?: string }
    | { type: 'joinRoom'; roomId: string; password?: string }
    | { type: 'leaveRoom' }
    | { type: 'closeRoom' }
    | { type: 'sendMessage'; message: string }
    | { type: 'addVideo'; video: YouTubeVideo }
    | { type: 'removeVideoFromQueue'; videoId: string }
    | { type: 'playNow'; video: YouTubeVideo }
    | { type: 'nextVideo' }
    | { type: 'setVolume'; volume: number }
    | { type: 'replay' }
    | { type: 'play' }
    | { type: 'pause' }
    | { type: 'seek'; time: number }
    | { type: 'videoFinished' }
    | { type: 'moveToTop'; videoId: string }
    | { type: 'shuffleQueue' }
    | { type: 'clearQueue' }
    | { type: 'clearHistory' }
);

export type ClientMessage = MessageBase & RawClientMessage;

export type ServerMessage =
    | { type: 'pong' }
    | { type: 'ack'; messageId: string }
    | { type: 'roomCreated'; roomId: string }
    | { type: 'roomUpdate'; room: Room }
    | { type: 'roomNotFound' }
    | { type: 'leftRoom' }
    | { type: 'message'; sender: string; content: string }
    | { type: 'error'; message: string }
    | { type: 'roomClosed'; reason: string }
    | { type: 'replay' }
    | { type: 'play' }
    | { type: 'pause' }
    | { type: 'volumeChanged'; volume: number }
    | { type: 'currentTimeChanged'; currentTime: number };

export type ConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

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
