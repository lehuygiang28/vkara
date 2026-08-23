import { ErrorCode, RoomError, type Room } from '@vkara/room';

/** Offline participants older than this are removed when the room is unlocked. */
export const STALE_PARTICIPANT_TTL_MS = 5 * 60 * 1000;

/** While locked, keep offline allowlist entries much longer so reconnecting guests are not surprised. */
export const STALE_PARTICIPANT_LOCKED_TTL_MS = 24 * 60 * 60 * 1000;

export function staleParticipantTtlMs(room: Pick<Room, 'locked'>): number {
    return room.locked ? STALE_PARTICIPANT_LOCKED_TTL_MS : STALE_PARTICIPANT_TTL_MS;
}

/** Lock only blocks brand-new devices; known participants may reconnect. */
export function canJoinWhenLocked(
    room: Pick<Room, 'locked' | 'participants'>,
    deviceId: string,
): boolean {
    if (!room.locked) return true;
    return Boolean(room.participants[deviceId]);
}

/** Drop offline participants past the grace window so lock allowlists stay accurate. */
export function pruneStaleParticipants(
    room: Room,
    now: number,
    isClientConnected: (clientId: string) => boolean,
): boolean {
    if (!room.participants || typeof room.participants !== 'object') {
        room.participants = {};
        room.hostDeviceId = room.hostDeviceId ?? '';
        room.locked = Boolean(room.locked);
        return true;
    }

    const ttlMs = staleParticipantTtlMs(room);
    let changed = false;

    for (const [deviceId, participant] of Object.entries(room.participants)) {
        const connectionIds = (participant.connectionIds || []).filter((id) =>
            isClientConnected(id),
        );
        if (connectionIds.length !== participant.connectionIds.length) {
            participant.connectionIds = connectionIds;
            changed = true;
        }
        if (
            participant.connectionIds.length === 0 &&
            now - (participant.lastSeen || 0) > ttlMs
        ) {
            delete room.participants[deviceId];
            changed = true;
            if (room.hostDeviceId === deviceId) {
                promoteHostAfterStalePrune(room);
            }
        }
    }

    return changed;
}

function promoteHostAfterStalePrune(room: Room): void {
    const candidates = Object.values(room.participants)
        .filter((p) => p.connectionIds.length > 0)
        .sort((a, b) => a.joinedAt - b.joinedAt);
    const nextHost = candidates[0];
    if (nextHost) {
        room.hostDeviceId = nextHost.deviceId;
        nextHost.role = 'host';
    } else {
        room.hostDeviceId = '';
    }
}

export function isHostParticipant(
    room: Pick<Room, 'participants'>,
    deviceId: string,
): boolean {
    const participant = room.participants[deviceId];
    return Boolean(participant && participant.role === 'host');
}

/**
 * Apply a `claimHost` mutation. Only an existing host may run this:
 * TV hosts reclaim the primary `hostDeviceId` slot; members cannot
 * self-promote (GHSA-w67q-x46v-w932).
 */
export function applyClaimHost(room: Room, deviceId: string): void {
    const participant = room.participants[deviceId];
    if (!participant) {
        throw new RoomError(ErrorCode.NOT_IN_ROOM);
    }
    if (participant.role !== 'host') {
        throw new RoomError(ErrorCode.NOT_HOST);
    }
    if (participant.isTvConnection) {
        room.hostDeviceId = participant.deviceId;
    } else if (!room.hostDeviceId || !room.participants[room.hostDeviceId]) {
        room.hostDeviceId = participant.deviceId;
    }
}

export function canUnlockRoom(
    room: Pick<Room, 'participants'>,
    deviceId: string,
): boolean {
    return Boolean(room.participants[deviceId]);
}
