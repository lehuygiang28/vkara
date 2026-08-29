import { createTestRoom } from '@vkara/room/test-fixtures';
import { describe, expect, it } from 'vitest';

import {
    STALE_PARTICIPANT_LOCKED_TTL_MS,
    STALE_PARTICIPANT_TTL_MS,
    canJoinWhenLocked,
    canUnlockRoom,
    isHostParticipant,
    pruneStaleParticipants,
    staleParticipantTtlMs,
} from '@/modules/room/participant-policy';

function participant(
    deviceId: string,
    overrides: Partial<{
        role: 'host' | 'member';
        joinedAt: number;
        lastSeen: number;
        connectionIds: string[];
        isTvConnection: boolean;
        isAgent: boolean;
    }> = {},
) {
    return {
        deviceId,
        displayName: deviceId,
        role: overrides.role ?? 'member',
        joinedAt: overrides.joinedAt ?? 1,
        lastSeen: overrides.lastSeen ?? 1,
        connectionIds: overrides.connectionIds ?? [],
        isTvConnection: overrides.isTvConnection ?? false,
        isAgent: overrides.isAgent ?? false,
    };
}

describe('canJoinWhenLocked', () => {
    it('allows join when room is unlocked', () => {
        const room = createTestRoom({ locked: false, participants: {} });
        expect(canJoinWhenLocked(room, 'new-device')).toBe(true);
    });

    it('blocks new devices when locked', () => {
        const room = createTestRoom({
            locked: true,
            participants: { host: participant('host', { role: 'host' }) },
        });
        expect(canJoinWhenLocked(room, 'stranger')).toBe(false);
    });

    it('allows known participants to rejoin when locked', () => {
        const room = createTestRoom({
            locked: true,
            participants: { guest: participant('guest') },
        });
        expect(canJoinWhenLocked(room, 'guest')).toBe(true);
    });
});

describe('staleParticipantTtlMs', () => {
    it('uses the short TTL when unlocked', () => {
        expect(staleParticipantTtlMs(createTestRoom({ locked: false }))).toBe(
            STALE_PARTICIPANT_TTL_MS,
        );
    });

    it('uses the extended TTL while locked', () => {
        expect(staleParticipantTtlMs(createTestRoom({ locked: true }))).toBe(
            STALE_PARTICIPANT_LOCKED_TTL_MS,
        );
    });
});

describe('pruneStaleParticipants', () => {
    it('removes offline participants after the unlocked grace window', () => {
        const now = STALE_PARTICIPANT_TTL_MS + 1;
        const room = createTestRoom({
            locked: false,
            hostDeviceId: 'host',
            participants: {
                host: participant('host', { role: 'host', lastSeen: now }),
                guest: participant('guest', { lastSeen: 0 }),
            },
        });

        const changed = pruneStaleParticipants(room, now, () => false);

        expect(changed).toBe(true);
        expect(room.participants.guest).toBeUndefined();
        expect(room.participants.host).toBeDefined();
    });

    it('keeps offline allowlist entries longer while locked', () => {
        const room = createTestRoom({
            locked: true,
            hostDeviceId: 'host',
            participants: {
                host: participant('host', { role: 'host', lastSeen: 0 }),
                guest: participant('guest', { lastSeen: 0 }),
            },
        });
        const now = STALE_PARTICIPANT_TTL_MS + 1;

        const changed = pruneStaleParticipants(room, now, () => false);

        expect(changed).toBe(false);
        expect(room.participants.guest).toBeDefined();
    });

    it('promotes the next live host when the primary host is pruned', () => {
        const room = createTestRoom({
            locked: false,
            hostDeviceId: 'host',
            participants: {
                host: participant('host', { role: 'host', lastSeen: 0, joinedAt: 1 }),
                guest: participant('guest', {
                    role: 'member',
                    lastSeen: 100,
                    joinedAt: 2,
                    connectionIds: ['ws-guest'],
                }),
            },
        });
        const now = STALE_PARTICIPANT_TTL_MS + 1;

        pruneStaleParticipants(room, now, (id) => id === 'ws-guest');

        expect(room.participants.host).toBeUndefined();
        expect(room.hostDeviceId).toBe('guest');
        expect(room.participants.guest?.role).toBe('host');
    });

    it('does not promote an agent when the primary host is pruned', () => {
        const room = createTestRoom({
            locked: false,
            hostDeviceId: 'host',
            participants: {
                host: participant('host', { role: 'host', lastSeen: 0, joinedAt: 1 }),
                agent: participant('agent', {
                    role: 'member',
                    lastSeen: 100,
                    joinedAt: 2,
                    connectionIds: ['ws-agent'],
                    isAgent: true,
                }),
            },
        });
        const now = STALE_PARTICIPANT_TTL_MS + 1;

        pruneStaleParticipants(room, now, (id) => id === 'ws-agent');

        expect(room.participants.host).toBeUndefined();
        expect(room.hostDeviceId).toBe('');
        expect(room.participants.agent?.role).toBe('member');
    });
});

describe('host and unlock helpers', () => {
    it('identifies host participants', () => {
        const room = createTestRoom({
            participants: { host: participant('host', { role: 'host' }) },
        });
        expect(isHostParticipant(room, 'host')).toBe(true);
        expect(isHostParticipant(room, 'guest')).toBe(false);
    });

    it('allows any in-room member to unlock', () => {
        const room = createTestRoom({
            participants: {
                host: participant('host', { role: 'host' }),
                guest: participant('guest'),
            },
        });
        expect(canUnlockRoom(room, 'host')).toBe(true);
        expect(canUnlockRoom(room, 'guest')).toBe(true);
        expect(canUnlockRoom(room, 'stranger')).toBe(false);
    });
});
