import { ErrorCode, RoomError } from '@vkara/room';
import { createTestRoom } from '@vkara/room/test-fixtures';
import { describe, expect, it } from 'vitest';

import { applyClaimHost } from '@/modules/room/participant-policy';

function participant(
    deviceId: string,
    overrides: Partial<{
        role: 'host' | 'member';
        isTvConnection: boolean;
        isAgent: boolean;
    }> = {},
) {
    return {
        deviceId,
        displayName: deviceId,
        role: overrides.role ?? 'member',
        joinedAt: 1,
        lastSeen: 1,
        connectionIds: ['ws-1'],
        isTvConnection: overrides.isTvConnection ?? false,
        isAgent: overrides.isAgent ?? false,
    };
}

describe('applyClaimHost', () => {
    it('rejects a non-host participant from self-promoting (GHSA-w67q-x46v-w932)', () => {
        const room = createTestRoom({
            hostDeviceId: 'host',
            participants: {
                host: participant('host', { role: 'host' }),
                attacker: participant('attacker', { role: 'member' }),
            },
        });

        let thrown: unknown;
        try {
            applyClaimHost(room, 'attacker');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(RoomError);
        expect((thrown as RoomError).code).toBe(ErrorCode.NOT_HOST);
        expect(room.participants.attacker?.role).toBe('member');
        expect(room.hostDeviceId).toBe('host');
    });

    it('rejects a device that is not in the room', () => {
        const room = createTestRoom({
            hostDeviceId: 'host',
            participants: {
                host: participant('host', { role: 'host' }),
            },
        });

        let thrown: unknown;
        try {
            applyClaimHost(room, 'stranger');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(RoomError);
        expect((thrown as RoomError).code).toBe(ErrorCode.NOT_IN_ROOM);
    });

    it('lets an existing host reclaim the primary slot when they are a TV', () => {
        const room = createTestRoom({
            hostDeviceId: 'remote',
            participants: {
                remote: participant('remote', { role: 'host' }),
                tv: participant('tv', { role: 'host', isTvConnection: true }),
            },
        });

        applyClaimHost(room, 'tv');

        expect(room.hostDeviceId).toBe('tv');
        expect(room.participants.tv?.role).toBe('host');
        expect(room.participants.remote?.role).toBe('host');
    });
});
