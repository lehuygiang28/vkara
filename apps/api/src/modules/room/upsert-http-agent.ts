import type { Room } from '@vkara/room';

const MAX_DISPLAY_NAME_LENGTH = 40;

function sanitizeDisplayName(value: string): string {
    const trimmed = value.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
    return trimmed.length > 0 ? trimmed : 'Agent';
}

/** Agent row with no live socket — never writes connectionIds or room.clients. */
export function upsertHttpAgentParticipant(
    room: Room,
    deviceId: string,
    displayName: string,
): void {
    const existing = room.participants[deviceId];
    const name = sanitizeDisplayName(displayName);
    if (existing) {
        existing.lastSeen = Date.now();
        existing.isAgent = true;
        existing.displayName = name;
        existing.connectionIds = [];
        existing.isTvConnection = false;
        return;
    }

    room.participants[deviceId] = {
        deviceId,
        displayName: name,
        role: 'member',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        connectionIds: [],
        isTvConnection: false,
        isAgent: true,
    };
}

export function touchHttpAgentLastSeen(room: Room, deviceId: string, displayName: string): void {
    upsertHttpAgentParticipant(room, deviceId, displayName);
}
