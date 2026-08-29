import { createTestRoom } from '@vkara/room/test-fixtures';
import { describe, expect, it } from 'vitest';

import { assignHostOnJoin } from '@/modules/room/assign-host';

function participant(
    deviceId: string,
    overrides: Partial<{
        role: 'host' | 'member';
        isTvConnection: boolean;
        isAgent: boolean;
        connectionIds: string[];
    }> = {},
) {
    return {
        deviceId,
        displayName: deviceId,
        role: overrides.role ?? 'member',
        joinedAt: 1,
        lastSeen: 1,
        connectionIds: overrides.connectionIds ?? ['ws-1'],
        isTvConnection: overrides.isTvConnection ?? false,
        isAgent: overrides.isAgent ?? false,
    };
}

describe('assignHostOnJoin', () => {
    it('does not crown an agent when the host slot is empty', () => {
        const room = createTestRoom({
            hostDeviceId: '',
            participants: {},
        });
        const agent = participant('agent-1', { isAgent: true, connectionIds: [] });
        room.participants['agent-1'] = agent;

        assignHostOnJoin(room, agent, { isTvClient: false, isAgent: true });

        expect(agent.role).toBe('member');
        expect(room.hostDeviceId).toBe('');
    });

    it('keeps an agent as member in a TV-led room with no remote co-host', () => {
        const tv = participant('tv', { role: 'host', isTvConnection: true });
        const agent = participant('agent-1', { isAgent: true, connectionIds: [] });
        const room = createTestRoom({
            hostDeviceId: 'tv',
            participants: { tv, 'agent-1': agent },
        });

        assignHostOnJoin(room, agent, { isTvClient: false, isAgent: true });

        expect(agent.role).toBe('member');
        expect(room.hostDeviceId).toBe('tv');
    });

    it('still makes the first human remote a co-host in a TV-led room', () => {
        const tv = participant('tv', { role: 'host', isTvConnection: true });
        const remote = participant('phone');
        const room = createTestRoom({
            hostDeviceId: 'tv',
            participants: { tv, phone: remote },
        });

        assignHostOnJoin(room, remote, { isTvClient: false, isAgent: false });

        expect(remote.role).toBe('host');
    });
});
