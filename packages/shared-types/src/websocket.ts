import type { ErrorCode } from './errors';
import type { YouTubeVideo } from './youtube';

export interface ClientInfo {
    id: string;
    roomId?: string;
    lastSeen?: number;
}

export interface Room {
    id: string;
    password?: string;
    clients: string[];
    videoQueue: YouTubeVideo[];
    historyQueue: YouTubeVideo[];
    volume: number;
    /** Corner QR overlay on the TV player (synced across clients). */
    showQRInPlayer: boolean;
    playingNow: YouTubeVideo | null;
    lastActivity: number;
    /** Set when the last client leaves; used to release empty rooms after a grace period. */
    emptySince?: number;
    creatorId: string;
    isPlaying: boolean;
    currentTime: number;
}

export interface MessageBase {
    id: string;
    timestamp: number;
}

/** TV recovery payload after server/Redis reset — no history. */
export interface TvRoomRestoreState {
    videoQueue: YouTubeVideo[];
    playingNow: YouTubeVideo | null;
    isPlaying: boolean;
    currentTime: number;
    volume: number;
    showQRInPlayer: boolean;
}

export type RawClientMessage = {
    requiresAck?: boolean;
} & (
    | { type: 'ping' }
    | {
          type: 'createRoom';
          password?: string;
          /** Only honored together with `restore` (TV recovery). */
          preferredRoomId?: string;
          restore?: TvRoomRestoreState;
      }
    | { type: 'joinRoom'; roomId: string; password?: string }
    | { type: 'reJoinRoom'; roomId: string; password?: string }
    | { type: 'leaveRoom' }
    | { type: 'closeRoom' }
    | { type: 'sendMessage'; message: string }
    | { type: 'addVideo'; video: YouTubeVideo }
    | { type: 'removeVideoFromQueue'; videoId: string }
    | { type: 'playNow'; video: YouTubeVideo }
    | { type: 'nextVideo' }
    | { type: 'setVolume'; volume: number }
    | { type: 'setShowQRInPlayer'; show: boolean }
    | { type: 'replay' }
    | { type: 'play' }
    | { type: 'pause' }
    | { type: 'seek'; time: number }
    | { type: 'syncPlaybackPosition'; time: number; force?: boolean }
    | { type: 'videoFinished' }
    | { type: 'skipUnplayableVideo'; videoId: string }
    | { type: 'moveToTop'; videoId: string }
    | { type: 'shuffleQueue' }
    | { type: 'clearQueue' }
    | { type: 'clearHistory' }
    | { type: 'addVideoAndMoveToTop'; video: YouTubeVideo }
    | { type: 'importPlaylist'; playlistUrlOrId: string }
);

export type ClientMessage = MessageBase & RawClientMessage;

export type ServerMessage =
    | { type: 'pong' }
    | { type: 'ack'; messageId: string }
    | { type: 'roomJoined'; yourId: string; room: Omit<Room, 'clients'> }
    | { type: 'roomCreated'; roomId: string }
    | { type: 'roomUpdate'; room: Omit<Room, 'clients'> }
    | { type: 'roomNotFound' }
    | { type: 'leftRoom' }
    | { type: 'message'; sender: string; content: string }
    | { type: 'error'; message: string }
    | { type: 'errorWithCode'; code: ErrorCode; message?: string }
    | { type: 'roomClosed'; reason: string }
    | { type: 'replay' }
    | { type: 'play' }
    | { type: 'pause' }
    | { type: 'volumeChanged'; volume: number }
    | { type: 'currentTimeChanged'; currentTime: number };

export type ConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
