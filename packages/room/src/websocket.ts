import type { ClientMessage } from '@vkara/validators/ws/client-message';
import type { CaptionTrack, YouTubeVideo } from '@vkara/youtube';

import type { ErrorCode } from './errors';

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
    /** Closed captions on the TV/laptop player (synced across clients). */
    captionsEnabled: boolean;
    /** Preferred caption track language (synced across clients). */
    captionsLanguage: string;
    /** Tracks reported by the TV player for `captionTracksVideoId` (empty = none). */
    captionTracks: CaptionTrack[];
    captionTracksVideoId: string | null;
    playingNow: YouTubeVideo | null;
    lastActivity: number;
    /** Set when the last client leaves; used to release empty rooms after a grace period. */
    emptySince?: number;
    creatorId: string;
    isPlaying: boolean;
    currentTime: number;
    /** TikTok photo-post carousel index (synced across clients). */
    tiktokPhotoIndex: number;
    /** Highest image index reported by the TV embed for the current photo post. */
    tiktokPhotoMaxIndex: number;
}

export type MessageBase = Pick<ClientMessage, 'id' | 'timestamp'>;

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Client payload before `id` / `timestamp` are attached (see `websocketStore.sendMessage`). */
export type RawClientMessage = DistributiveOmit<ClientMessage, 'id' | 'timestamp'>;

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
    | { type: 'currentTimeChanged'; currentTime: number; videoId: string | null }
    | {
          type: 'tiktokPhotoIndexChanged';
          index: number;
          maxIndex: number;
          videoId: string | null;
      };

export type ConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
