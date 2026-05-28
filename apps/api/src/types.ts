import { Video } from 'youtube-sr';
import { ErrorCode } from '@/errors';

export interface ClientInfo {
    id: string;
    roomId?: string;
    lastSeen?: number;
}

export interface SearchResults {
    items?: YouTubeVideo[];
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}

export type YouTubeVideo = Omit<
    ReturnType<Video['toJSON']>,
    | 'shorts_url'
    | 'description'
    | 'unlisted'
    | 'nsfw'
    | 'tags'
    | 'ratings'
    | 'shorts'
    | 'live'
    | 'private'
    | 'music'
    | 'channel'
    | 'thumbnail'
> & {
    channel: {
        name: string;
        verified: boolean;
    };
    thumbnail: {
        url: string;
    };
};

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
    requiresAck?: boolean;
}

export type ClientMessage = MessageBase &
    (
        | { type: 'ping' }
        | { type: 'createRoom'; password?: string }
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
        | { type: 'replay' }
        | { type: 'play' }
        | { type: 'pause' }
        | { type: 'seek'; time: number }
        | { type: 'videoFinished' }
        | { type: 'moveToTop'; videoId: string }
        | { type: 'shuffleQueue' }
        | { type: 'clearQueue' }
        | { type: 'clearHistory' }
        | { type: 'addVideoAndMoveToTop'; video: YouTubeVideo }
        | { type: 'importPlaylist'; playlistUrlOrId: string }
    );

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
