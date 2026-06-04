import { z } from 'zod';

import { youtubeVideoSchema } from '../youtube/video';

const messageBaseSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    requiresAck: z.boolean().optional(),
});

const captionTrackSchema = z.object({
    languageCode: z.string(),
    displayName: z.string(),
    kind: z.string().optional(),
});

export const tvRoomRestoreSchema = z.object({
    videoQueue: z.array(youtubeVideoSchema),
    playingNow: youtubeVideoSchema.nullable(),
    isPlaying: z.boolean(),
    currentTime: z.number(),
    volume: z.number(),
    showQRInPlayer: z.boolean(),
    captionsEnabled: z.boolean(),
    captionsLanguage: z.string(),
    captionTracks: z.array(captionTrackSchema),
    captionTracksVideoId: z.string().nullable(),
});

const withBase = <T extends z.ZodRawShape>(shape: T) => messageBaseSchema.extend(shape);

export const wsClientMessageSchema = z.discriminatedUnion('type', [
    withBase({ type: z.literal('ping') }),
    withBase({
        type: z.literal('createRoom'),
        password: z.string().optional(),
        preferredRoomId: z.string().optional(),
        restore: tvRoomRestoreSchema.optional(),
    }),
    withBase({
        type: z.literal('joinRoom'),
        roomId: z.string(),
        password: z.string().optional(),
    }),
    withBase({
        type: z.literal('reJoinRoom'),
        roomId: z.string(),
        password: z.string().optional(),
    }),
    withBase({ type: z.literal('leaveRoom') }),
    withBase({ type: z.literal('closeRoom') }),
    withBase({ type: z.literal('sendMessage'), message: z.string() }),
    withBase({ type: z.literal('addVideo'), video: youtubeVideoSchema }),
    withBase({ type: z.literal('removeVideoFromQueue'), videoId: z.string() }),
    withBase({ type: z.literal('playNow'), video: youtubeVideoSchema }),
    withBase({ type: z.literal('nextVideo') }),
    withBase({ type: z.literal('setVolume'), volume: z.number() }),
    withBase({ type: z.literal('setShowQRInPlayer'), show: z.boolean() }),
    withBase({ type: z.literal('setCaptionsEnabled'), enabled: z.boolean() }),
    withBase({ type: z.literal('setCaptionsLanguage'), languageCode: z.string() }),
    withBase({
        type: z.literal('syncCaptionTracks'),
        videoId: z.string(),
        tracks: z.array(captionTrackSchema),
    }),
    withBase({ type: z.literal('replay') }),
    withBase({ type: z.literal('play') }),
    withBase({ type: z.literal('pause') }),
    withBase({ type: z.literal('seek'), time: z.number() }),
    withBase({
        type: z.literal('syncPlaybackPosition'),
        time: z.number(),
        force: z.boolean().optional(),
    }),
    withBase({ type: z.literal('videoFinished') }),
    withBase({ type: z.literal('skipUnplayableVideo'), videoId: z.string() }),
    withBase({ type: z.literal('moveToTop'), videoId: z.string() }),
    withBase({ type: z.literal('shuffleQueue') }),
    withBase({ type: z.literal('clearQueue') }),
    withBase({ type: z.literal('clearHistory') }),
    withBase({ type: z.literal('addVideoAndMoveToTop'), video: youtubeVideoSchema }),
    withBase({ type: z.literal('importPlaylist'), playlistUrlOrId: z.string() }),
]);

export type ClientMessage = z.infer<typeof wsClientMessageSchema>;
export type TvRoomRestoreState = z.infer<typeof tvRoomRestoreSchema>;
