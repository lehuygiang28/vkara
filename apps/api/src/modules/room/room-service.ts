import type { ElysiaWS } from 'elysia/ws';

import { cleanUpRoomField, generateRandomNumber, shuffleArray } from '@/utils/common';
import { roomLogger, createContextLogger } from '@/utils/logger';
import { DEFAULT_CAPTION_LANGUAGE, type CaptionTrack, type YouTubeVideo } from '@vkara/youtube';
import { getTikTokPhotoMaxIndex, isTikTokVideo } from '@vkara/tiktok';
import {
    ErrorCode,
    RoomError,
    shouldBroadcastPlaybackTime,
    acceptSyncPlaybackPositionTime,
    type PlaybackTimeSyncState,
    type ClientInfo,
    type Participant,
    type Room,
    type ServerMessage,
} from '@vkara/room';
import { isValidRoomId, ROOM_ID_LENGTH } from '@vkara/room';
import type { ClientMessage, TvRoomRestoreState } from '@vkara/validators/ws/client-message';
import { applyTvRestoreToRoom } from '@/modules/room/apply-tv-restore';
import { applyClaimHost, canJoinWhenLocked } from '@/modules/room/participant-policy';
import { publishToRoom } from '@/modules/room/room-broadcast';
import { resolvePlaylistDetails } from '@/modules/youtube/fetch-playlist-details-cached';
import {
    checkEmbeddable,
    filterYouTubeVideosByEmbeddability,
} from '@/modules/youtube/resolve-embed-playability';
import { resolveNextEmbeddableFromQueue } from '@/modules/youtube/resolve-embeddable-queue';
import { mergeQueueAfterAdvance } from '@/modules/room/merge-queue-after-advance';
import { redis } from '@/redis';
import { consumeJoinToken } from '@/modules/url-commands/join-token';
import {
    isVideoAlreadyInRoom,
    loadRoom,
    mutateRoom,
    requireRoom,
    writeRoom,
} from '@/utils/room-store';

const serviceLogger = createContextLogger('RoomService');

const MAX_CAPTION_TRACKS = 64;
/** Mirrors `displayName` max length in packages/validators/src/ws/client-message.ts. */
const MAX_DISPLAY_NAME_LENGTH = 40;

/**
 * Per-connection scratchpad we attach to the underlying ElysiaWS instance so we can
 * resolve the deviceId from any handler without threading it through every signature.
 */
interface WsDeviceState {
    deviceId: string;
    isTvConnection: boolean;
    displayName?: string;
}

function getWsDeviceState(ws: ElysiaWS): WsDeviceState | undefined {
    return (ws as unknown as { __vkaraDevice?: WsDeviceState }).__vkaraDevice;
}

function setWsDeviceState(ws: ElysiaWS, state: WsDeviceState): void {
    (ws as unknown as { __vkaraDevice?: WsDeviceState }).__vkaraDevice = state;
}

function resolveDeviceId(ws: ElysiaWS, incoming?: string): string {
    const existing = getWsDeviceState(ws);
    if (existing) return existing.deviceId;
    const deviceId = incoming && incoming.length > 0 ? incoming : `anon-${ws.id}`;
    return deviceId;
}

function makeDisplayName(isTvConnection: boolean, index: number): string {
    if (isTvConnection) return 'TV';
    // Prefer client-sent labels (model / user name). This is only a last-resort fallback.
    return `Remote #${Math.max(1, index)}`;
}

/**
 * Normalize a client-supplied display name: trim, cap length, fall back when empty.
 * Mirrors the runtime guard in `setDisplayName` so create/join/rejoin can never
 * store whitespace-only or oversized names (defense in depth before the WS schema).
 */
function sanitizeDisplayName(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function upsertParticipant(
    room: Room,
    deviceId: string,
    wsId: string,
    isTvClient: boolean,
    displayName?: string,
): Participant {
    const existing = room.participants[deviceId];

    if (existing) {
        if (!existing.connectionIds.includes(wsId)) {
            existing.connectionIds.push(wsId);
        }
        existing.lastSeen = Date.now();
        if (isTvClient && !existing.isTvConnection) {
            existing.isTvConnection = true;
            existing.displayName = existing.displayName || 'TV';
        }
        const next = displayName
            ? sanitizeDisplayName(displayName, existing.displayName)
            : undefined;
        if (next) {
            existing.displayName = next;
        }
        return existing;
    }

    const remoteCount = Object.values(room.participants).filter((p) => !p.isTvConnection).length;
    const participant: Participant = {
        deviceId,
        displayName: sanitizeDisplayName(displayName, makeDisplayName(isTvClient, remoteCount + 1)),
        role: 'member',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        connectionIds: [wsId],
        isTvConnection: isTvClient,
    };
    room.participants[deviceId] = participant;
    return participant;
}

function pruneConnectionFromParticipant(participant: Participant | undefined, wsId: string): void {
    if (!participant) return;
    participant.connectionIds = participant.connectionIds.filter((id) => id !== wsId);
    participant.lastSeen = Date.now();
}

/**
 * Co-host helper: any participant whose `role === 'host'` can drive the room
 * (lock/unlock/closeRoom/queue control). `room.hostDeviceId` is just the
 * primary host used for sorting and legacy single-host code paths.
 */
function requireHost(room: Room, actorDeviceId: string): Participant {
    const actor = room.participants[actorDeviceId];
    if (!actor || actor.role !== 'host') {
        throw new RoomError(ErrorCode.NOT_HOST);
    }
    return actor;
}

function promoteNewHost(room: Room, excludingDeviceId?: string): Participant | undefined {
    // Prefer an existing live co-host before falling back to the next member.
    const existingHost = Object.values(room.participants).find(
        (p) => p.deviceId !== excludingDeviceId && p.role === 'host' && p.connectionIds.length > 0,
    );
    if (existingHost) {
        room.hostDeviceId = existingHost.deviceId;
        return existingHost;
    }

    const candidates = Object.values(room.participants)
        .filter((p) => p.deviceId !== excludingDeviceId && p.connectionIds.length > 0)
        .sort((a, b) => a.joinedAt - b.joinedAt);
    const newHost = candidates[0];
    if (!newHost) return undefined;
    room.hostDeviceId = newHost.deviceId;
    newHost.role = 'host';
    // Demote only the departed primary host id slot — co-hosts are preserved.
    Object.values(room.participants).forEach((p) => {
        if (p.deviceId === excludingDeviceId && p.role === 'host') {
            p.role = 'member';
        }
    });
    return newHost;
}

function markCaptionTracksPending(room: Room, videoId: string | null): void {
    room.captionTracks = [];
    room.captionTracksVideoId = videoId;
}

function resetTikTokPhotoIndex(room: Room): void {
    room.tiktokPhotoIndex = 0;
    room.tiktokPhotoMaxIndex = getTikTokPhotoMaxIndex({ video: room.playingNow, roomMaxIndex: 0 });
}

function clampCaptionTracks(tracks: CaptionTrack[]): CaptionTrack[] {
    return tracks.slice(0, MAX_CAPTION_TRACKS).map((track) => ({
        languageCode: track.languageCode.slice(0, 16),
        displayName: track.displayName.slice(0, 120),
        kind: track.kind?.slice(0, 16),
    }));
}

export type RoomServiceDeps = {
    wsConnections: Map<string, ElysiaWS>;
    sendToClient: (ws: ElysiaWS, message: ServerMessage) => void;
};

function normalizeRoomPassword(password?: string): string | undefined {
    const trimmed = password?.trim();
    return trimmed ? trimmed : undefined;
}

function broadcastRoomState(roomId: string, room: Room): void {
    publishToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) });
}

async function getClientInfo(wsId: string): Promise<ClientInfo | null> {
    const clientInfo = await redis.hgetall(`client:${wsId}`);
    if (!clientInfo.roomId) return null;
    return {
        id: wsId,
        roomId: clientInfo.roomId,
        deviceId: clientInfo.deviceId || undefined,
    };
}

async function findRoomIdByClient(ws: ElysiaWS): Promise<string | undefined> {
    const clientInfo = await getClientInfo(ws.id);
    return clientInfo?.roomId;
}

async function validateClientInRoom(ws: ElysiaWS): Promise<string> {
    const roomId = await findRoomIdByClient(ws);
    if (!roomId) {
        throw new RoomError(ErrorCode.NOT_IN_ROOM);
    }
    return roomId;
}

async function roomIdExists(roomId: string): Promise<boolean> {
    return Boolean(await redis.exists(`room:${roomId}`));
}

/** Throttles currentTime WS spam per room. */
const lastPlaybackBroadcastByRoom = new Map<string, PlaybackTimeSyncState>();

/** Coalesces concurrent advance/skip requests per room. */
const advanceInFlightByRoom = new Map<string, Promise<void>>();

export function createRoomService({ wsConnections, sendToClient }: RoomServiceDeps) {
    async function buildClientDeviceIdMap(
        clientIds: string[],
        fallbackDeviceId: string,
    ): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        await Promise.all(
            clientIds.map(async (clientId) => {
                const fromRedis = await redis.hget(`client:${clientId}`, 'deviceId');
                const stored = getWsDeviceState(wsConnections.get(clientId) ?? ({} as ElysiaWS));
                map.set(clientId, fromRedis ?? stored?.deviceId ?? fallbackDeviceId);
            }),
        );
        return map;
    }

    async function leaveCurrentRoom(
        ws: ElysiaWS,
        opts: { removeParticipant?: boolean } = {},
    ): Promise<string | null> {
        const clientInfo = await getClientInfo(ws.id);
        if (!clientInfo?.roomId) return null;

        const { roomId } = clientInfo;
        const leavingDeviceId =
            getWsDeviceState(ws)?.deviceId ?? clientInfo.deviceId ?? `anon-${ws.id}`;
        const removeParticipant = opts.removeParticipant === true;

        ws.unsubscribe(roomId);

        // When the user explicitly leaves (vs. an unexpected ws drop) we evict the
        // whole device from the participant list so it disappears from the panel.
        // Multi-tab siblings of the same device also lose their seat here; the ws
        // close handler downstream only prunes the connectionId, keeping the
        // participant offline so it can reconnect to a locked room (rejoin).
        const evictedClientIds: string[] = [];
        const preLeaveRoom = await loadRoom(roomId);
        const clientDeviceIds = preLeaveRoom
            ? await buildClientDeviceIdMap(preLeaveRoom.clients, leavingDeviceId)
            : new Map<string, string>();
        const room = await mutateRoom(roomId, (room) => {
            if (removeParticipant) {
                const affected = room.clients.filter((id) => {
                    const remoteDeviceId = clientDeviceIds.get(id) ?? leavingDeviceId;
                    return remoteDeviceId === leavingDeviceId;
                });
                evictedClientIds.push(...affected);
                room.clients = room.clients.filter((id) => !affected.includes(id));

                for (const id of affected) {
                    const sibling = wsConnections.get(id);
                    if (sibling) {
                        sibling.unsubscribe(roomId);
                    }
                }

                const leavingParticipant = room.participants[leavingDeviceId];
                if (room.hostDeviceId === leavingDeviceId) {
                    promoteNewHost(room, leavingDeviceId);
                }
                if (leavingParticipant) {
                    delete room.participants[leavingDeviceId];
                }
                if (room.clients.length === 0) {
                    room.emptySince = Date.now();
                }
            } else {
                room.clients = room.clients.filter((id) => id !== ws.id);
                pruneConnectionFromParticipant(room.participants[leavingDeviceId], ws.id);
                // Auto-promote host when the host device has no live connections left.
                const wasHost = room.hostDeviceId === leavingDeviceId;
                const hostParticipant = wasHost ? room.participants[leavingDeviceId] : undefined;
                if (wasHost && hostParticipant && hostParticipant.connectionIds.length === 0) {
                    promoteNewHost(room, leavingDeviceId);
                }
                if (room.clients.length === 0) {
                    room.emptySince = Date.now();
                }
            }
        });

        if (removeParticipant && evictedClientIds.length > 0) {
            await Promise.all(
                evictedClientIds.map((id) => redis.hdel(`client:${id}`, 'roomId', 'deviceId')),
            );
        } else {
            await redis.hdel(`client:${ws.id}`, 'roomId', 'deviceId');
        }

        if (room.clients.length > 0) {
            broadcastRoomState(roomId, room);
            // Notify every live co-host — they need `youAreHost` to drive the UI,
            // regardless of which ones still hold the primary `hostDeviceId` slot.
            for (const participant of Object.values(room.participants)) {
                if (participant.role !== 'host') continue;
                for (const connectionId of participant.connectionIds) {
                    const hostWs = wsConnections.get(connectionId);
                    if (hostWs) {
                        sendToClient(hostWs, { type: 'youAreHost' });
                    }
                }
            }
        }

        roomLogger.info('Client left room', {
            clientId: ws.id,
            roomId,
            remainingClients: room.clients.length,
            leftDeviceId: leavingDeviceId,
            explicit: removeParticipant,
            evicted: evictedClientIds.length,
            newHost: room.hostDeviceId,
        });

        return roomId;
    }

    async function joinRoomInternal(
        ws: ElysiaWS,
        roomId: string,
        opts: {
            deviceId: string;
            isTvClient: boolean;
            displayName?: string;
            isRejoin?: boolean;
        },
    ) {
        // When rejoining the same room we must NOT evict the participant entry —
        // rejoin is the "I lost my socket and want back in" flow, which relies on
        // the offline participant surviving so the locked-room check still passes.
        // Switching to a different room counts as explicitly leaving the old one.
        const clientInfo = await getClientInfo(ws.id);
        const leavingSameRoom = opts.isRejoin && clientInfo?.roomId === roomId;
        await leaveCurrentRoom(ws, {
            removeParticipant: !leavingSameRoom,
        });

        const room = await mutateRoom(
            roomId,
            (room) => {
                if (!canJoinWhenLocked(room, opts.deviceId)) {
                    throw new RoomError(ErrorCode.ROOM_LOCKED);
                }
                if (!room.clients.includes(ws.id)) {
                    room.clients.push(ws.id);
                    delete room.emptySince;
                } else if (room.emptySince) {
                    delete room.emptySince;
                }
                if (opts.deviceId && !room.participants[opts.deviceId]) {
                    room.participants[opts.deviceId] = {
                        deviceId: opts.deviceId,
                        displayName: sanitizeDisplayName(
                            opts.displayName,
                            makeDisplayName(
                                opts.isTvClient,
                                Object.values(room.participants).filter((p) => !p.isTvConnection)
                                    .length + 1,
                            ),
                        ),
                        role: 'member',
                        joinedAt: Date.now(),
                        lastSeen: Date.now(),
                        connectionIds: [],
                        isTvConnection: opts.isTvClient,
                    };
                }
                const participant = upsertParticipant(
                    room,
                    opts.deviceId,
                    ws.id,
                    opts.isTvClient,
                    opts.displayName,
                );
                // First connection / empty room → becomes host.
                if (!room.hostDeviceId || !room.participants[room.hostDeviceId]) {
                    room.hostDeviceId = participant.deviceId;
                    participant.role = 'host';
                } else if (opts.isTvClient) {
                    // TV always reclaims the primary-host slot when it (re)joins, so the
                    // living-room device leads the room — but it no longer demotes other
                    // co-hosts (first remote stays a host so they can lock/kick too).
                    room.hostDeviceId = participant.deviceId;
                    participant.role = 'host';
                } else {
                    // First remote to arrive in a TV-led room becomes a co-host so they
                    // can coordinate (lock/kick/closeRoom) without fumbling on the TV UI.
                    const existingHost = room.participants[room.hostDeviceId];
                    const hasRemoteCoHost = Object.values(room.participants).some(
                        (p) =>
                            p.role === 'host' &&
                            !p.isTvConnection &&
                            p.deviceId !== participant.deviceId,
                    );
                    if (
                        existingHost?.isTvConnection &&
                        !hasRemoteCoHost &&
                        participant.role !== 'host'
                    ) {
                        participant.role = 'host';
                    }
                }
            },
            { isRejoin: opts.isRejoin },
        );

        ws.subscribe(roomId);
        await redis.hset(`client:${ws.id}`, 'roomId', roomId, 'deviceId', opts.deviceId);
        setWsDeviceState(ws, {
            deviceId: opts.deviceId,
            isTvConnection: opts.isTvClient,
            displayName: opts.displayName,
        });
        sendToClient(ws, { type: 'roomJoined', yourId: ws.id, room: cleanUpRoomField(room) });
        if (room.hostDeviceId === opts.deviceId) {
            sendToClient(ws, { type: 'youAreHost' });
        } else if (room.participants[opts.deviceId]?.role === 'host') {
            // Co-host (e.g. first remote joining a TV-led room).
            sendToClient(ws, { type: 'youAreHost' });
        }

        roomLogger.info('Client joined room', {
            clientId: ws.id,
            roomId,
            clientCount: room.clients.length,
            isCreator: room.creatorId === ws.id,
            deviceId: opts.deviceId,
            isTvClient: opts.isTvClient,
            role: room.participants[opts.deviceId]?.role,
        });
    }

    async function generateAvailableRoomId(): Promise<string> {
        let roomId: string;
        let roomExists: boolean;

        do {
            roomId = generateRandomNumber({ digits: ROOM_ID_LENGTH }).toString();
            roomExists = await roomIdExists(roomId);
        } while (roomExists);

        return roomId;
    }

    async function resolveCreateRoomId(
        preferredRoomId?: string,
        restore?: TvRoomRestoreState,
    ): Promise<string> {
        if (
            restore &&
            preferredRoomId &&
            isValidRoomId(preferredRoomId) &&
            !(await roomIdExists(preferredRoomId))
        ) {
            return preferredRoomId;
        }

        if (restore && preferredRoomId && (await roomIdExists(preferredRoomId))) {
            roomLogger.debug('Preferred room id taken during TV recovery, using random id', {
                preferredRoomId,
            });
        }

        return generateAvailableRoomId();
    }

    async function createRoom(
        ws: ElysiaWS,
        options: {
            password?: string;
            preferredRoomId?: string;
            restore?: TvRoomRestoreState;
            deviceId?: string;
            isTvClient?: boolean;
            displayName?: string;
        } = {},
    ) {
        const deviceId = resolveDeviceId(ws, options.deviceId);
        const isTvClient = options.isTvClient === true;
        const roomId = await resolveCreateRoomId(
            options.restore ? options.preferredRoomId : undefined,
            options.restore,
        );

        roomLogger.info(`Creating new room`, {
            roomId,
            creatorId: ws.id,
            deviceId,
            isTvClient,
            tvRecovery: Boolean(options.restore),
            preferredRoomId: options.restore ? options.preferredRoomId : undefined,
        });

        const room: Room = {
            id: roomId,
            password: normalizeRoomPassword(options.password),
            clients: [ws.id],
            videoQueue: [],
            historyQueue: [],
            volume: 100,
            showQRInPlayer: true,
            captionsEnabled: false,
            captionsLanguage: DEFAULT_CAPTION_LANGUAGE,
            captionTracks: [],
            captionTracksVideoId: null,
            playingNow: null,
            lastActivity: Date.now(),
            creatorId: ws.id,
            isPlaying: false,
            currentTime: 0,
            tiktokPhotoIndex: 0,
            tiktokPhotoMaxIndex: 0,
            locked: false,
            participants: {},
            hostDeviceId: deviceId,
        };

        if (options.restore) {
            applyTvRestoreToRoom(room, options.restore);
        }

        await writeRoom(roomId, room);
        await joinRoomInternal(ws, roomId, {
            deviceId,
            isTvClient,
            displayName: options.displayName,
        });
        sendToClient(ws, { type: 'roomCreated', roomId });
    }

    async function joinRoom(
        ws: ElysiaWS,
        roomId: string,
        options: {
            password?: string;
            joinToken?: string;
            isRejoin?: boolean;
            deviceId?: string;
            isTvClient?: boolean;
            displayName?: string;
        } = {},
    ) {
        const isRejoin = options.isRejoin === true;
        const deviceId = resolveDeviceId(ws, options.deviceId);
        const isTvClient = options.isTvClient === true;

        roomLogger.info(isRejoin ? 'Client rejoining room' : 'Client joining room', {
            clientId: ws.id,
            roomId,
            isRejoin,
            deviceId,
            isTvClient,
        });

        const room = await requireRoom(roomId, isRejoin);

        const expectedPassword = normalizeRoomPassword(room.password);
        if (options.joinToken) {
            const accepted = await consumeJoinToken(redis, options.joinToken, roomId);
            if (!accepted) {
                throw new RoomError(ErrorCode.INCORRECT_PASSWORD);
            }
        } else if (expectedPassword) {
            const providedPassword = normalizeRoomPassword(options.password) ?? '';
            if (providedPassword !== expectedPassword) {
                throw new RoomError(ErrorCode.INCORRECT_PASSWORD);
            }
        }

        // Lock only blocks brand-new devices; known participants may reconnect.
        if (!canJoinWhenLocked(room, deviceId)) {
            throw new RoomError(ErrorCode.ROOM_LOCKED);
        }

        await joinRoomInternal(ws, roomId, {
            deviceId,
            isTvClient,
            displayName: options.displayName,
            isRejoin,
        });

        // Notify everyone else that participants changed.
        const updated = await requireRoom(roomId);
        broadcastRoomState(roomId, updated);
    }

    async function resolveDeviceIdForWs(ws: ElysiaWS): Promise<string | null> {
        const fromState = getWsDeviceState(ws)?.deviceId;
        if (fromState) return fromState;
        const clientInfo = await getClientInfo(ws.id);
        return clientInfo?.deviceId ?? null;
    }

    async function lockRoom(ws: ElysiaWS): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const deviceId = await resolveDeviceIdForWs(ws);
        if (!deviceId) {
            throw new RoomError(ErrorCode.NOT_IN_ROOM);
        }

        const room = await mutateRoom(roomId, (room) => {
            const participant = room.participants[deviceId];
            if (!participant || participant.role !== 'host') {
                throw new RoomError(ErrorCode.NOT_HOST);
            }
            room.locked = true;
            room.lockedAt = Date.now();
            room.lockedBy = deviceId;
        });

        broadcastRoomState(roomId, room);
        roomLogger.info('Room locked', { roomId, lockedBy: deviceId });
    }

    async function unlockRoom(ws: ElysiaWS): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const deviceId = await resolveDeviceIdForWs(ws);
        if (!deviceId) {
            throw new RoomError(ErrorCode.NOT_IN_ROOM);
        }

        const room = await mutateRoom(roomId, (room) => {
            if (!room.participants[deviceId]) {
                throw new RoomError(ErrorCode.NOT_IN_ROOM);
            }
            room.locked = false;
            delete room.lockedAt;
            delete room.lockedBy;
        });

        broadcastRoomState(roomId, room);
        roomLogger.info('Room unlocked', { roomId, unlockedBy: deviceId });
    }

    async function claimHost(ws: ElysiaWS): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const deviceId = await resolveDeviceIdForWs(ws);
        if (!deviceId) {
            throw new RoomError(ErrorCode.NOT_IN_ROOM);
        }

        const room = await mutateRoom(roomId, (room) => {
            applyClaimHost(room, deviceId);
        });

        broadcastRoomState(roomId, room);
        sendToClient(ws, { type: 'youAreHost' });
    }

    async function promoteParticipant(ws: ElysiaWS, targetDeviceId: string): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const actorDeviceId = await resolveDeviceIdForWs(ws);
        if (!actorDeviceId) {
            throw new RoomError(ErrorCode.NOT_IN_ROOM);
        }
        if (targetDeviceId === actorDeviceId) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Cannot promote yourself');
        }

        const room = await mutateRoom(roomId, (room) => {
            requireHost(room, actorDeviceId);
            const target = room.participants[targetDeviceId];
            if (!target) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Participant not found');
            }
            if (target.role === 'host') {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Participant is already a host');
            }
            // Co-host: promote without stealing the primary hostDeviceId slot.
            target.role = 'host';
            target.lastSeen = Date.now();
        });

        // Pub/sub may not echo to the acting socket — send roomUpdate directly so the
        // host UI updates immediately (badge/menu) without waiting on a round-trip race.
        const roomPayload = cleanUpRoomField(room);
        broadcastRoomState(roomId, room);
        sendToClient(ws, { type: 'roomUpdate', room: roomPayload });
        const promoted = room.participants[targetDeviceId];
        if (promoted) {
            for (const connectionId of promoted.connectionIds) {
                const targetWs = wsConnections.get(connectionId);
                if (targetWs) {
                    sendToClient(targetWs, { type: 'youAreHost' });
                    sendToClient(targetWs, { type: 'roomUpdate', room: roomPayload });
                }
            }
        }
        roomLogger.info('Participant promoted', {
            roomId,
            actorDeviceId,
            targetDeviceId,
        });
    }

    async function demoteParticipant(ws: ElysiaWS, targetDeviceId: string): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const actorDeviceId = await resolveDeviceIdForWs(ws);
        if (!actorDeviceId) {
            throw new RoomError(ErrorCode.NOT_IN_ROOM);
        }
        if (targetDeviceId === actorDeviceId) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Cannot demote yourself');
        }

        const room = await mutateRoom(roomId, (room) => {
            requireHost(room, actorDeviceId);
            const target = room.participants[targetDeviceId];
            if (!target) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Participant not found');
            }
            if (target.role !== 'host') {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Participant is not a host');
            }
            const otherHosts = Object.values(room.participants).filter(
                (p) => p.deviceId !== targetDeviceId && p.role === 'host',
            );
            if (otherHosts.length === 0) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Cannot demote the last host');
            }
            target.role = 'member';
            target.lastSeen = Date.now();
            if (room.hostDeviceId === targetDeviceId) {
                promoteNewHost(room, targetDeviceId);
            }
        });

        const roomPayload = cleanUpRoomField(room);
        broadcastRoomState(roomId, room);
        sendToClient(ws, { type: 'roomUpdate', room: roomPayload });
        const demoted = room.participants[targetDeviceId];
        if (demoted) {
            for (const connectionId of demoted.connectionIds) {
                const targetWs = wsConnections.get(connectionId);
                if (targetWs) {
                    sendToClient(targetWs, { type: 'roomUpdate', room: roomPayload });
                }
            }
        }
        roomLogger.info('Participant demoted', {
            roomId,
            actorDeviceId,
            targetDeviceId,
            newHost: room.hostDeviceId,
        });
    }

    async function kickParticipant(ws: ElysiaWS, targetDeviceId: string): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const actorDeviceId = await resolveDeviceIdForWs(ws);
        if (!actorDeviceId) {
            throw new RoomError(ErrorCode.NOT_IN_ROOM);
        }
        if (targetDeviceId === actorDeviceId) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Cannot kick yourself');
        }

        const snapshot = await requireRoom(roomId);
        requireHost(snapshot, actorDeviceId);
        const target = snapshot.participants[targetDeviceId];
        if (!target) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Participant not found');
        }
        if (target.isTvConnection) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Cannot kick the TV device');
        }

        const affectedClientIds = new Set(target.connectionIds);
        const clientDeviceIds = await buildClientDeviceIdMap(snapshot.clients, targetDeviceId);
        for (const clientId of snapshot.clients) {
            if (clientDeviceIds.get(clientId) === targetDeviceId) {
                affectedClientIds.add(clientId);
            }
        }
        const reason = 'Removed by host';

        // Notify target sockets before eviction so they can clear local room state.
        for (const connectionId of affectedClientIds) {
            const targetWs = wsConnections.get(connectionId);
            if (targetWs) {
                targetWs.unsubscribe(roomId);
                sendToClient(targetWs, { type: 'kicked', reason });
            }
        }

        const room = await mutateRoom(roomId, (room) => {
            requireHost(room, actorDeviceId);
            const liveTarget = room.participants[targetDeviceId];
            if (!liveTarget) {
                return;
            }
            if (liveTarget.isTvConnection) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Cannot kick the TV device');
            }

            for (const connectionId of liveTarget.connectionIds) {
                affectedClientIds.add(connectionId);
            }
            for (const clientId of room.clients) {
                if (clientDeviceIds.get(clientId) === targetDeviceId) {
                    affectedClientIds.add(clientId);
                }
            }

            room.clients = room.clients.filter((id) => !affectedClientIds.has(id));
            for (const id of affectedClientIds) {
                const sibling = wsConnections.get(id);
                if (sibling) {
                    sibling.unsubscribe(roomId);
                }
            }

            if (room.hostDeviceId === targetDeviceId) {
                promoteNewHost(room, targetDeviceId);
            }
            delete room.participants[targetDeviceId];
            if (room.clients.length === 0) {
                room.emptySince = Date.now();
            }
        });

        await Promise.all(
            [...affectedClientIds].map((id) => redis.hdel(`client:${id}`, 'roomId', 'deviceId')),
        );

        if (room.clients.length > 0) {
            const roomPayload = cleanUpRoomField(room);
            broadcastRoomState(roomId, room);
            sendToClient(ws, { type: 'roomUpdate', room: roomPayload });
            for (const participant of Object.values(room.participants)) {
                if (participant.role !== 'host') continue;
                for (const connectionId of participant.connectionIds) {
                    const hostWs = wsConnections.get(connectionId);
                    if (hostWs) {
                        sendToClient(hostWs, { type: 'youAreHost' });
                    }
                }
            }
        }

        roomLogger.info('Participant kicked', {
            roomId,
            actorDeviceId,
            targetDeviceId,
            remainingClients: room.clients.length,
            newHost: room.hostDeviceId,
        });
    }

    async function setDisplayName(ws: ElysiaWS, displayName: string): Promise<void> {
        const trimmed = displayName.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
        if (!trimmed) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Display name cannot be empty');
        }

        const roomId = await validateClientInRoom(ws);
        const deviceId = await resolveDeviceIdForWs(ws);
        if (!deviceId) {
            throw new RoomError(ErrorCode.NOT_IN_ROOM);
        }

        const room = await mutateRoom(roomId, (room) => {
            const participant = room.participants[deviceId];
            if (!participant) {
                throw new RoomError(ErrorCode.NOT_IN_ROOM);
            }
            participant.displayName = trimmed;
            participant.lastSeen = Date.now();
        });

        broadcastRoomState(roomId, room);
    }

    async function leaveRoom(ws: ElysiaWS) {
        await leaveCurrentRoom(ws, { removeParticipant: true });
        sendToClient(ws, { type: 'leftRoom' });
    }

    async function closeRoom(roomId: string, reason = 'Room closed by creator') {
        const room = await requireRoom(roomId);
        lastPlaybackBroadcastByRoom.delete(roomId);

        for (const clientId of room.clients) {
            const clientWs = wsConnections.get(clientId);
            if (clientWs) {
                clientWs.unsubscribe(roomId);
                sendToClient(clientWs, { type: 'roomClosed', reason });
            }
        }

        await Promise.all([
            redis.del(`room:${roomId}`),
            ...room.clients.map((clientId) => redis.hdel(`client:${clientId}`, 'roomId')),
        ]);
    }

    async function handleCloseRoom(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await requireRoom(roomId);

        const deviceId = await resolveDeviceIdForWs(ws);
        const isCreator = room.creatorId === ws.id;
        const isHost = deviceId ? room.participants[deviceId]?.role === 'host' : false;
        // Creator or any current host may close the room — remote co-hosts can
        // wind down the session without walking over to the TV.
        if (!isCreator && !isHost) {
            throw new RoomError(ErrorCode.NOT_CREATOR_OF_ROOM);
        }

        roomLogger.info('Room closed by creator', {
            roomId,
            creatorId: ws.id,
            clientCount: room.clients.length,
        });

        await closeRoom(roomId);
    }

    async function addVideo(ws: ElysiaWS, video: YouTubeVideo): Promise<void> {
        if (!video?.id) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video data');
        }

        const roomId = await validateClientInRoom(ws);

        try {
            if (!isTikTokVideo(video) && !(await checkEmbeddable(redis, video.id))) {
                throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
            }

            const room = await mutateRoom(roomId, (room) => {
                if (isVideoAlreadyInRoom(room, video.id)) {
                    throw new RoomError(ErrorCode.ALREADY_IN_QUEUE);
                }

                if (!room.playingNow && room.videoQueue.length <= 0) {
                    room.playingNow = video;
                    room.isPlaying = true;
                    room.currentTime = 0;
                    resetTikTokPhotoIndex(room);
                    markCaptionTracksPending(room, video.id);
                    lastPlaybackBroadcastByRoom.delete(roomId);
                } else {
                    room.videoQueue = [...room.videoQueue, video];
                }
            });

            broadcastRoomState(roomId, room);
        } catch (error) {
            if (error instanceof RoomError) throw error;
            serviceLogger.error('Failed to add video', { videoId: video.id, error });
            throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Failed to add video');
        }
    }

    async function restartPlayingNow(ws: ElysiaWS): Promise<void> {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            if (!room.playingNow) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'No video is currently playing');
            }
            room.currentTime = 0;
            resetTikTokPhotoIndex(room);
            room.isPlaying = true;
            lastPlaybackBroadcastByRoom.delete(roomId);
        });

        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'replay' });
    }

    async function playVideoNow(ws: ElysiaWS, video: YouTubeVideo) {
        const roomId = await validateClientInRoom(ws);

        if (!isTikTokVideo(video) && !(await checkEmbeddable(redis, video.id))) {
            throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
        }

        let restartedSameVideo = false;
        const room = await mutateRoom(roomId, (room) => {
            if (room.playingNow?.id === video.id) {
                restartedSameVideo = true;
                room.isPlaying = true;
                room.currentTime = 0;
                resetTikTokPhotoIndex(room);
                lastPlaybackBroadcastByRoom.delete(roomId);
                return;
            }

            room.historyQueue = room.historyQueue.filter((v) => v.id !== video.id);
            room.videoQueue = room.videoQueue.filter((v) => v.id !== video.id);

            if (room.playingNow?.id) {
                room.historyQueue = [
                    room.playingNow,
                    ...room.historyQueue.filter((v) => v.id !== room.playingNow!.id),
                ];
            }

            room.playingNow = video;
            room.isPlaying = true;
            room.currentTime = 0;
            resetTikTokPhotoIndex(room);
            markCaptionTracksPending(room, video.id);
            lastPlaybackBroadcastByRoom.delete(roomId);
        });

        broadcastRoomState(roomId, room);
        if (restartedSameVideo) {
            publishToRoom(roomId, { type: 'replay' });
        }
    }

    async function advanceToNextPlayable(
        ws: ElysiaWS,
        options: { archiveCurrent?: boolean } = {},
    ): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const inFlight = advanceInFlightByRoom.get(roomId);
        if (inFlight) {
            return inFlight;
        }

        const advancePromise = (async () => {
            const archiveCurrent = options.archiveCurrent ?? true;
            const snapshot = await requireRoom(roomId);

            if (!snapshot.playingNow && snapshot.videoQueue.length === 0) {
                return;
            }

            const snapshotQueue = snapshot.videoQueue;
            const { video: nextPlayable, remainingQueue } = await resolveNextEmbeddableFromQueue(
                redis,
                snapshotQueue,
            );

            const room = await mutateRoom(roomId, (room) => {
                if (archiveCurrent && room.playingNow?.id) {
                    room.historyQueue = [
                        room.playingNow,
                        ...room.historyQueue.filter((v) => v.id !== room.playingNow!.id),
                    ];
                }

                room.videoQueue = mergeQueueAfterAdvance(
                    snapshotQueue,
                    remainingQueue,
                    room.videoQueue,
                );

                if (nextPlayable) {
                    room.playingNow = nextPlayable;
                    room.isPlaying = true;
                    room.currentTime = 0;
                    resetTikTokPhotoIndex(room);
                    markCaptionTracksPending(room, nextPlayable.id);
                } else {
                    room.playingNow = null;
                    room.isPlaying = false;
                    room.currentTime = 0;
                    resetTikTokPhotoIndex(room);
                    markCaptionTracksPending(room, null);
                }

                lastPlaybackBroadcastByRoom.delete(roomId);
            });

            broadcastRoomState(roomId, room);
        })();

        advanceInFlightByRoom.set(roomId, advancePromise);
        try {
            await advancePromise;
        } finally {
            if (advanceInFlightByRoom.get(roomId) === advancePromise) {
                advanceInFlightByRoom.delete(roomId);
            }
        }
    }

    async function nextVideo(ws: ElysiaWS) {
        await advanceToNextPlayable(ws, { archiveCurrent: true });
    }

    async function skipUnplayableVideo(ws: ElysiaWS, videoId: string) {
        const roomId = await validateClientInRoom(ws);
        const snapshot = await requireRoom(roomId);

        if (snapshot.playingNow?.id && videoId && snapshot.playingNow.id !== videoId) {
            return;
        }

        await advanceToNextPlayable(ws, { archiveCurrent: false });

        publishToRoom(roomId, {
            type: 'errorWithCode',
            code: ErrorCode.VIDEO_NOT_EMBEDDABLE,
        });
    }

    async function setVolume(ws: ElysiaWS, volume: number): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const clamped = Math.min(100, Math.max(0, volume));

        const room = await mutateRoom(roomId, (room) => {
            room.volume = clamped;
        });

        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'volumeChanged', volume: room.volume });
    }

    async function setShowQRInPlayer(ws: ElysiaWS, show: boolean): Promise<void> {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            room.showQRInPlayer = show;
        });

        broadcastRoomState(roomId, room);
    }

    async function setCaptionsEnabled(ws: ElysiaWS, enabled: boolean): Promise<void> {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            room.captionsEnabled = enabled;
        });

        broadcastRoomState(roomId, room);
    }

    async function setCaptionsLanguage(ws: ElysiaWS, languageCode: string): Promise<void> {
        const trimmed = languageCode.trim();
        if (!trimmed) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid captions language');
        }

        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.captionsLanguage = trimmed;
        });

        broadcastRoomState(roomId, room);
    }

    async function syncCaptionTracks(
        ws: ElysiaWS,
        videoId: string,
        tracks: CaptionTrack[],
    ): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const clamped = clampCaptionTracks(tracks);

        const room = await mutateRoom(roomId, (room) => {
            if (!room.playingNow || room.playingNow.id !== videoId) {
                return;
            }
            room.captionTracks = clamped;
            room.captionTracksVideoId = videoId;
        });

        broadcastRoomState(roomId, room);
    }

    async function play(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.isPlaying = true;
        });
        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'play' });
    }

    async function pause(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.isPlaying = false;
        });
        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'pause' });
    }

    async function seek(ws: ElysiaWS, time: number) {
        const roomId = await validateClientInRoom(ws);
        let playingVideoId: string | null = null;

        await mutateRoom(roomId, (room) => {
            room.currentTime = time;
            playingVideoId = room.playingNow?.id ?? null;
        });

        lastPlaybackBroadcastByRoom.set(roomId, { at: Date.now(), seconds: time });
        publishToRoom(roomId, {
            type: 'currentTimeChanged',
            currentTime: time,
            videoId: playingVideoId,
        });
    }

    async function tiktokNavigatePhoto(ws: ElysiaWS, index: number, videoId: string) {
        const roomId = await validateClientInRoom(ws);
        const targetIndex = Math.max(0, Math.floor(index));
        let playingVideoId: string | null = null;
        let maxIndex = 0;

        await mutateRoom(roomId, (room) => {
            if (!room.playingNow || room.playingNow.id !== videoId) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Photo navigation video mismatch');
            }
            const effectiveMax = getTikTokPhotoMaxIndex({
                video: room.playingNow,
                roomMaxIndex: room.tiktokPhotoMaxIndex,
            });
            if (effectiveMax > 0 && targetIndex > effectiveMax) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Photo index out of range');
            }
            room.tiktokPhotoIndex = targetIndex;
            room.tiktokPhotoMaxIndex = effectiveMax;
            playingVideoId = room.playingNow.id;
            maxIndex = effectiveMax;
        });

        publishToRoom(roomId, {
            type: 'tiktokPhotoIndexChanged',
            index: targetIndex,
            maxIndex,
            videoId: playingVideoId,
        });
    }

    async function syncTikTokPhotoIndex(
        ws: ElysiaWS,
        index: number,
        maxIndex: number,
        videoId: string,
    ) {
        const roomId = await validateClientInRoom(ws);
        const targetIndex = Math.max(0, Math.floor(index));
        const targetMaxIndex = Math.max(0, Math.floor(maxIndex), targetIndex);
        let playingVideoId: string | null = null;
        let accepted = false;

        await mutateRoom(roomId, (room) => {
            if (!room.playingNow || room.playingNow.id !== videoId) {
                return;
            }
            playingVideoId = room.playingNow.id;
            if (
                room.tiktokPhotoIndex === targetIndex &&
                room.tiktokPhotoMaxIndex === targetMaxIndex
            ) {
                return;
            }
            room.tiktokPhotoIndex = targetIndex;
            room.tiktokPhotoMaxIndex = getTikTokPhotoMaxIndex({
                video: room.playingNow,
                roomMaxIndex: Math.max(room.tiktokPhotoMaxIndex, targetMaxIndex),
            });
            accepted = true;
        });

        if (!accepted || !playingVideoId) {
            return;
        }

        const room = await requireRoom(roomId);
        publishToRoom(roomId, {
            type: 'tiktokPhotoIndexChanged',
            index: room.tiktokPhotoIndex,
            maxIndex: getTikTokPhotoMaxIndex({
                video: room.playingNow,
                roomMaxIndex: room.tiktokPhotoMaxIndex,
            }),
            videoId: playingVideoId,
        });
    }

    async function syncPlaybackPosition(
        ws: ElysiaWS,
        time: number,
        force = false,
        videoId?: string,
    ) {
        const roomId = await validateClientInRoom(ws);
        let previousTime = 0;
        let acceptedTime: number | null = null;
        let activeVideoId: string | null = null;

        await mutateRoom(roomId, (room) => {
            activeVideoId = room.playingNow?.id ?? null;
            if (videoId && activeVideoId && videoId !== activeVideoId) {
                acceptedTime = null;
                return;
            }

            previousTime = room.currentTime;
            acceptedTime = acceptSyncPlaybackPositionTime(room.currentTime, time);
            if (acceptedTime !== null) {
                room.currentTime = acceptedTime;
            }
        });

        if (acceptedTime === null) {
            return;
        }

        const lastBroadcast = lastPlaybackBroadcastByRoom.get(roomId);
        if (!force && !shouldBroadcastPlaybackTime(lastBroadcast, acceptedTime, previousTime)) {
            return;
        }

        lastPlaybackBroadcastByRoom.set(roomId, { at: Date.now(), seconds: acceptedTime });
        publishToRoom(roomId, {
            type: 'currentTimeChanged',
            currentTime: acceptedTime,
            videoId: activeVideoId,
        });
    }

    async function replay(ws: ElysiaWS) {
        await restartPlayingNow(ws);
    }

    async function moveVideoToTop(ws: ElysiaWS, videoId: string) {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            const videoForMove = room.videoQueue.find((v) => v.id === videoId);
            if (!videoForMove) {
                throw new RoomError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found in queue');
            }
            room.videoQueue = room.videoQueue.filter((v) => v.id !== videoId);
            room.videoQueue.unshift(videoForMove);
        });

        broadcastRoomState(roomId, room);
    }

    async function shuffleQueue(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.videoQueue = shuffleArray(room.videoQueue);
        });
        broadcastRoomState(roomId, room);
    }

    async function clearQueue(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.videoQueue = [];
        });
        broadcastRoomState(roomId, room);
    }

    async function clearHistory(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.historyQueue = [];
        });
        broadcastRoomState(roomId, room);
    }

    async function removeVideoFromQueue(ws: ElysiaWS, videoId: string) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.videoQueue = room.videoQueue.filter((v) => v.id !== videoId);
        });
        broadcastRoomState(roomId, room);
    }

    async function addVideoAndMoveToTop(ws: ElysiaWS, video: YouTubeVideo) {
        const roomId = await validateClientInRoom(ws);

        if (!isTikTokVideo(video) && !(await checkEmbeddable(redis, video.id))) {
            throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
        }

        const room = await mutateRoom(roomId, (room) => {
            if (room.playingNow?.id === video.id) {
                return;
            }

            if (isVideoAlreadyInRoom(room, video.id)) {
                room.videoQueue = room.videoQueue.filter((v) => v.id !== video.id);
            }

            if (!room.playingNow && room.videoQueue.length <= 0) {
                room.playingNow = video;
                room.isPlaying = true;
                room.currentTime = 0;
                resetTikTokPhotoIndex(room);
                lastPlaybackBroadcastByRoom.delete(roomId);
            } else {
                room.videoQueue = [video, ...room.videoQueue];
            }
        });

        broadcastRoomState(roomId, room);
    }

    async function importPlaylist(ws: ElysiaWS, playlistUrlOrId: string) {
        const roomId = await validateClientInRoom(ws);

        let videos: YouTubeVideo[];
        try {
            // TODO(phase-2): Enrich via prepareYoutubeVideos after rate-limit/UX research
            // (view counts, channel verified). See fetch-playlist-videos.ts module note.
            const details = await resolvePlaylistDetails(redis, playlistUrlOrId, {
                fetchAll: true,
                limit: 200,
                mode: 'refresh',
            });
            videos = details.videos;
        } catch (error) {
            serviceLogger.error('Import playlist failed', { error, playlistUrlOrId });
            throw new RoomError(
                ErrorCode.INVALID_MESSAGE,
                'Could not load playlist. Check the URL and try again.',
            );
        }

        if (videos.length === 0) {
            throw new RoomError(
                ErrorCode.VIDEO_NOT_FOUND,
                'Playlist is empty or could not be loaded.',
            );
        }

        const embeddableVideos = await filterYouTubeVideosByEmbeddability(redis, videos);

        if (embeddableVideos.length === 0) {
            throw new RoomError(
                ErrorCode.VIDEO_NOT_FOUND,
                'No embeddable videos found in this playlist.',
            );
        }

        const snapshot = await requireRoom(roomId);
        const shouldStartPlayback = !snapshot.playingNow;

        const room = await mutateRoom(roomId, (room) => {
            const existingIds = new Set([
                ...room.videoQueue.map((v) => v.id),
                ...(room.playingNow?.id ? [room.playingNow.id] : []),
            ]);
            const newVideos = embeddableVideos.filter((video) => !existingIds.has(video.id));

            room.videoQueue = [...room.videoQueue, ...newVideos];
        });

        if (shouldStartPlayback && room.videoQueue.length > 0) {
            await advanceToNextPlayable(ws, { archiveCurrent: false });
            return;
        }

        broadcastRoomState(roomId, room);
    }

    async function handleMessage(ws: ElysiaWS, message: ClientMessage): Promise<void> {
        if (message.requiresAck && message.id) {
            sendToClient(ws, { type: 'ack', messageId: message.id });
        }

        // Keep deviceId on the socket for leave/lock handlers even when the message
        // is not a join/create (e.g. after process restart the in-memory state is gone).
        // After the first successful join, deviceId is frozen — ignore spoofed overrides.
        if (message.deviceId) {
            const clientInfo = await getClientInfo(ws.id);
            const existing = getWsDeviceState(ws);
            const boundDeviceId = clientInfo?.deviceId ?? existing?.deviceId;
            setWsDeviceState(ws, {
                deviceId: boundDeviceId ?? message.deviceId,
                isTvConnection: existing?.isTvConnection ?? false,
                displayName: existing?.displayName,
            });
        }

        switch (message.type) {
            case 'ping':
                sendToClient(ws, { type: 'pong' });
                break;
            case 'createRoom':
                await createRoom(ws, {
                    password: message.password,
                    preferredRoomId: message.preferredRoomId,
                    restore: message.restore,
                    deviceId: message.deviceId,
                    isTvClient: message.isTvClient,
                    displayName: message.displayName,
                });
                break;
            case 'joinRoom':
                await joinRoom(ws, message.roomId, {
                    password: message.password,
                    joinToken: message.joinToken,
                    deviceId: message.deviceId,
                    isTvClient: message.isTvClient,
                    displayName: message.displayName,
                });
                break;
            case 'reJoinRoom':
                await joinRoom(ws, message.roomId, {
                    password: message.password,
                    joinToken: message.joinToken,
                    isRejoin: true,
                    deviceId: message.deviceId,
                    isTvClient: message.isTvClient,
                    displayName: message.displayName,
                });
                break;
            case 'leaveRoom':
                await leaveRoom(ws);
                break;
            case 'closeRoom':
                await handleCloseRoom(ws);
                break;
            case 'lockRoom':
                await lockRoom(ws);
                break;
            case 'unlockRoom':
                await unlockRoom(ws);
                break;
            case 'claimHost':
                await claimHost(ws);
                break;
            case 'kickParticipant':
                if (
                    typeof message.targetDeviceId !== 'string' ||
                    message.targetDeviceId.length === 0
                ) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid device ID');
                }
                await kickParticipant(ws, message.targetDeviceId);
                break;
            case 'promoteParticipant':
                if (
                    typeof message.targetDeviceId !== 'string' ||
                    message.targetDeviceId.length === 0
                ) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid device ID');
                }
                await promoteParticipant(ws, message.targetDeviceId);
                break;
            case 'demoteParticipant':
                if (
                    typeof message.targetDeviceId !== 'string' ||
                    message.targetDeviceId.length === 0
                ) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid device ID');
                }
                await demoteParticipant(ws, message.targetDeviceId);
                break;
            case 'setDisplayName':
                if (typeof message.displayName !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid display name');
                }
                await setDisplayName(ws, message.displayName);
                break;
            case 'sendMessage': {
                const roomId = await validateClientInRoom(ws);
                publishToRoom(roomId, {
                    type: 'message',
                    sender: ws.id,
                    content: message.message,
                });
                break;
            }
            case 'addVideo':
                if (!message.video) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Missing video data');
                }
                await addVideo(ws, message.video);
                break;
            case 'playNow':
                if (!message.video) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Missing video data');
                }
                await playVideoNow(ws, message.video);
                break;
            case 'nextVideo':
                await nextVideo(ws);
                break;
            case 'setVolume':
                if (typeof message.volume !== 'number') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid volume value');
                }
                await setVolume(ws, message.volume);
                break;
            case 'setShowQRInPlayer':
                if (typeof message.show !== 'boolean') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid showQRInPlayer value');
                }
                await setShowQRInPlayer(ws, message.show);
                break;
            case 'setCaptionsEnabled':
                if (typeof message.enabled !== 'boolean') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid captionsEnabled value');
                }
                await setCaptionsEnabled(ws, message.enabled);
                break;
            case 'setCaptionsLanguage':
                if (typeof message.languageCode !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid captions language');
                }
                await setCaptionsLanguage(ws, message.languageCode);
                break;
            case 'syncCaptionTracks':
                if (typeof message.videoId !== 'string' || !Array.isArray(message.tracks)) {
                    throw new RoomError(
                        ErrorCode.INVALID_MESSAGE,
                        'Invalid caption tracks payload',
                    );
                }
                await syncCaptionTracks(ws, message.videoId, message.tracks);
                break;
            case 'replay':
                await replay(ws);
                break;
            case 'play':
                await play(ws);
                break;
            case 'pause':
                await pause(ws);
                break;
            case 'seek':
                if (typeof message.time !== 'number') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid time value');
                }
                await seek(ws, message.time);
                break;
            case 'tiktokNavigatePhoto':
                if (typeof message.index !== 'number' || typeof message.videoId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid photo navigation');
                }
                await tiktokNavigatePhoto(ws, message.index, message.videoId);
                break;
            case 'syncTikTokPhotoIndex':
                if (
                    typeof message.index !== 'number' ||
                    typeof message.maxIndex !== 'number' ||
                    typeof message.videoId !== 'string'
                ) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid photo index sync');
                }
                await syncTikTokPhotoIndex(ws, message.index, message.maxIndex, message.videoId);
                break;
            case 'syncPlaybackPosition':
                if (typeof message.time !== 'number') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid time value');
                }
                if (typeof message.videoId !== 'string' || message.videoId.length === 0) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video ID');
                }
                await syncPlaybackPosition(
                    ws,
                    message.time,
                    message.force === true,
                    message.videoId,
                );
                break;
            case 'videoFinished':
                await nextVideo(ws);
                break;
            case 'skipUnplayableVideo':
                if (!message.videoId || typeof message.videoId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video ID');
                }
                await skipUnplayableVideo(ws, message.videoId);
                break;
            case 'moveToTop':
                if (!message.videoId || typeof message.videoId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video ID');
                }
                await moveVideoToTop(ws, message.videoId);
                break;
            case 'shuffleQueue':
                await shuffleQueue(ws);
                break;
            case 'clearQueue':
                await clearQueue(ws);
                break;
            case 'clearHistory':
                await clearHistory(ws);
                break;
            case 'removeVideoFromQueue':
                if (!message.videoId || typeof message.videoId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video ID');
                }
                await removeVideoFromQueue(ws, message.videoId);
                break;
            case 'addVideoAndMoveToTop':
                if (!message.video) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Missing video data');
                }
                await addVideoAndMoveToTop(ws, message.video);
                break;
            case 'importPlaylist':
                if (!message.playlistUrlOrId || typeof message.playlistUrlOrId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid playlist URL or ID');
                }
                await importPlaylist(ws, message.playlistUrlOrId);
                break;
            default:
                throw new RoomError(
                    ErrorCode.INVALID_MESSAGE,
                    `Unknown message type: ${(message as { type: string }).type}`,
                );
        }
    }

    return {
        closeRoom,
        handleMessage,
        leaveCurrentRoom,
    };
}

export type RoomService = ReturnType<typeof createRoomService>;
