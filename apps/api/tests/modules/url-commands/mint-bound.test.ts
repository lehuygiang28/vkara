import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomUnavailableError } from '@/modules/url-commands/room-unavailable';

vi.mock('@/utils/room-store', () => ({
    loadRoom: vi.fn(),
}));

import { loadRoom } from '@/utils/room-store';
import { mintBoundJoinToken } from '@/modules/url-commands/tools';

function memoryRedis() {
    const map = new Map<string, string>();
    return {
        async set(key: string, value: string) {
            map.set(key, value);
            return 'OK';
        },
        async getdel(key: string) {
            const value = map.get(key) ?? null;
            map.delete(key);
            return value;
        },
    };
}

const bind = { roomId: '4821', displayName: 'Claude' };

describe('mintBoundJoinToken', () => {
    beforeEach(() => {
        vi.mocked(loadRoom).mockReset();
    });

    it('refuses to mint when the room is missing with the opaque error', async () => {
        vi.mocked(loadRoom).mockResolvedValue(null as never);
        await expect(mintBoundJoinToken(memoryRedis() as never, bind)).rejects.toBeInstanceOf(
            RoomUnavailableError,
        );
    });

    it('requires the room password when the room has one', async () => {
        vi.mocked(loadRoom).mockResolvedValue({ password: 'party' } as never);
        await expect(
            mintBoundJoinToken(memoryRedis() as never, bind, 'nope'),
        ).rejects.toBeInstanceOf(RoomUnavailableError);
    });

    it('mints when the room password matches', async () => {
        vi.mocked(loadRoom).mockResolvedValue({ password: 'party' } as never);
        const minted = await mintBoundJoinToken(memoryRedis() as never, bind, 'party');
        expect(minted.roomId).toBe('4821');
        expect(minted.bind).toEqual(bind);
        expect(minted.joinToken.length).toBeGreaterThanOrEqual(8);
    });

    it('refuses a public room without a password', async () => {
        vi.mocked(loadRoom).mockResolvedValue({} as never);
        await expect(mintBoundJoinToken(memoryRedis() as never, bind)).rejects.toBeInstanceOf(
            RoomUnavailableError,
        );
    });

    it('does not mint a different room with a stolen password', async () => {
        vi.mocked(loadRoom).mockImplementation(async (roomId: string) => {
            if (roomId === '4821') {
                return { password: 'party' } as never;
            }
            return { password: 'other-room' } as never;
        });
        await expect(
            mintBoundJoinToken(memoryRedis() as never, { roomId: '9999', displayName: 'Claude' }, 'party'),
        ).rejects.toBeInstanceOf(RoomUnavailableError);
    });
});
