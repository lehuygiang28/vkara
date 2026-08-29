import type { ClientMessage } from '@vkara/validators/ws/client-message';
import type { CaptionTrack, YouTubeVideo } from '@vkara/youtube';

import type { ErrorCode } from './errors';

export interface ClientInfo {
    id: string;
    roomId?: string;
    lastSeen?: number;
    /** Anonymous device id (set when the join/create message carries one). */
    deviceId?: string;
}

export type ClientRole = 'host' | 'member';

export interface Participant {
    deviceId: string;
    /** Friendly label: user name, device model (e.g. "Pixel 7"), or coarse fallback ("iPhone", "TV"). */
    displayName: string;
    role: ClientRole;
    /** ms since epoch — used to pick auto-promote host when current host leaves. */
    joinedAt: number;
    /** Last time this device was seen connected (updated on join, leave, and heartbeat sweep). */
    lastSeen: number;
    /** Active ws.id values for this device (one device may have multiple tabs). */
    connectionIds: string[];
    /** True when the connection was reported as a TV client. */
    isTvConnection: boolean;
    /** True when the device joined as an AI agent (URL agent=1 or joinToken). */
    isAgent: boolean;
}

export interface Room {
    id: string;
    password?: string;
    /** Client-safe flag — password plaintext is never broadcast. */
    hasPassword?: boolean;
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
    /** When true, only devices already in `participants` may join. */
    locked: boolean;
    lockedAt?: number;
    lockedBy?: string;
    /** deviceId → participant. Source of truth for the participants panel. */
    participants: Record<string, Participant>;
    /** Device id of the current host (migratable — moves to the longest-joined member on host leave). */
    hostDeviceId: string;
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
    | { type: 'youAreHost' }
    | { type: 'kicked'; reason: string }
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
