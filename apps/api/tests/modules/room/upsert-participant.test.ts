import { createTestRoom } from '@vkara/room/test-fixtures';
import { describe, expect, it } from 'vitest';

import { upsertParticipant } from '@/modules/room/upsert-participant';

describe('upsertParticipant isAgent', () => {
    it('creates a new participant with isAgent when flagged', () => {
        const room = createTestRoom({ participants: {} });
        const participant = upsertParticipant(room, 'agent-1', 'ws-1', false, 'Claude', true);

        expect(participant.isAgent).toBe(true);
        expect(participant.displayName).toBe('Claude');
    });

    it('defaults isAgent to false for humans', () => {
        const room = createTestRoom({ participants: {} });
        const participant = upsertParticipant(room, 'human-1', 'ws-1', false, 'Trang');

        expect(participant.isAgent).toBe(false);
    });

    it('sticky-upgrades isAgent on rejoin without clearing the flag', () => {
        const room = createTestRoom({ participants: {} });
        upsertParticipant(room, 'agent-1', 'ws-1', false, 'Claude', true);
        const again = upsertParticipant(room, 'agent-1', 'ws-2', false, undefined, false);

        expect(again.isAgent).toBe(true);
    });

    it('can upgrade an existing human participant to agent', () => {
        const room = createTestRoom({ participants: {} });
        upsertParticipant(room, 'd1', 'ws-1', false, 'Remote');
        const upgraded = upsertParticipant(room, 'd1', 'ws-2', false, undefined, true);

        expect(upgraded.isAgent).toBe(true);
    });
});
