import type { Participant, Room } from '@vkara/room';

/**
 * Host assignment for a newly upserted participant.
 * Agents never become host — not even when the host slot is empty.
 */
export function assignHostOnJoin(
    room: Room,
    participant: Participant,
    opts: { isTvClient: boolean; isAgent?: boolean },
): void {
    if (opts.isAgent) {
        return;
    }

    if (!room.hostDeviceId || !room.participants[room.hostDeviceId]) {
        room.hostDeviceId = participant.deviceId;
        participant.role = 'host';
        return;
    }

    if (opts.isTvClient) {
        room.hostDeviceId = participant.deviceId;
        participant.role = 'host';
        return;
    }

    const existingHost = room.participants[room.hostDeviceId];
    const hasRemoteCoHost = Object.values(room.participants).some(
        (p) =>
            p.role === 'host' &&
            !p.isTvConnection &&
            !p.isAgent &&
            p.deviceId !== participant.deviceId,
    );
    if (existingHost?.isTvConnection && !hasRemoteCoHost && participant.role !== 'host') {
        participant.role = 'host';
    }
}
