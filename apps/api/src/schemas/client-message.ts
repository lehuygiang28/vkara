import { t } from 'elysia';

const messageBaseSchema = t.Object({
    id: t.String(),
    timestamp: t.Number(),
    requiresAck: t.Optional(t.Boolean()),
});

const youTubeVideoSchema = t.Object({
    id: t.String(),
    duration: t.Number(),
    duration_formatted: t.String(),
    title: t.String(),
    type: t.String(),
    uploadedAt: t.String(),
    url: t.String(),
    views: t.Number(),
    channel: t.Object({
        name: t.String(),
        verified: t.Boolean(),
    }),
    thumbnail: t.Object({
        url: t.String(),
    }),
});

const withBase = <T extends ReturnType<typeof t.Object>>(schema: T) =>
    t.Intersect([messageBaseSchema, schema]);

export const wsClientMessageSchema = t.Union([
    withBase(t.Object({ type: t.Literal('ping') })),
    withBase(t.Object({ type: t.Literal('createRoom'), password: t.Optional(t.String()) })),
    withBase(
        t.Object({
            type: t.Literal('joinRoom'),
            roomId: t.String(),
            password: t.Optional(t.String()),
        }),
    ),
    withBase(
        t.Object({
            type: t.Literal('reJoinRoom'),
            roomId: t.String(),
            password: t.Optional(t.String()),
        }),
    ),
    withBase(t.Object({ type: t.Literal('leaveRoom') })),
    withBase(t.Object({ type: t.Literal('closeRoom') })),
    withBase(t.Object({ type: t.Literal('sendMessage'), message: t.String() })),
    withBase(t.Object({ type: t.Literal('addVideo'), video: youTubeVideoSchema })),
    withBase(t.Object({ type: t.Literal('removeVideoFromQueue'), videoId: t.String() })),
    withBase(t.Object({ type: t.Literal('playNow'), video: youTubeVideoSchema })),
    withBase(t.Object({ type: t.Literal('nextVideo') })),
    withBase(t.Object({ type: t.Literal('setVolume'), volume: t.Number() })),
    withBase(t.Object({ type: t.Literal('replay') })),
    withBase(t.Object({ type: t.Literal('play') })),
    withBase(t.Object({ type: t.Literal('pause') })),
    withBase(t.Object({ type: t.Literal('seek'), time: t.Number() })),
    withBase(t.Object({ type: t.Literal('videoFinished') })),
    withBase(t.Object({ type: t.Literal('moveToTop'), videoId: t.String() })),
    withBase(t.Object({ type: t.Literal('shuffleQueue') })),
    withBase(t.Object({ type: t.Literal('clearQueue') })),
    withBase(t.Object({ type: t.Literal('clearHistory') })),
    withBase(t.Object({ type: t.Literal('addVideoAndMoveToTop'), video: youTubeVideoSchema })),
    withBase(t.Object({ type: t.Literal('importPlaylist'), playlistUrlOrId: t.String() })),
]);
