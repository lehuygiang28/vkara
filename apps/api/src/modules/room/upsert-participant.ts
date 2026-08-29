import type { Participant, Room } from '@vkara/room';

/** Mirrors `displayName` max length in packages/validators/src/ws/client-message.ts. */
const MAX_DISPLAY_NAME_LENGTH = 40;

function makeDisplayName(isTvConnection: boolean, index: number): string {
    if (isTvConnection) return 'TV';
    return `Remote #${Math.max(1, index)}`;
}

function sanitizeDisplayName(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function upsertParticipant(
    room: Room,
    deviceId: string,
    wsId: string,
    isTvClient: boolean,
    displayName?: string,
    isAgent?: boolean,
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
        if (isAgent) {
            existing.isAgent = true;
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
        isAgent: Boolean(isAgent),
    };
    room.participants[deviceId] = participant;
    return participant;
}
