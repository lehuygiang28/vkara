import { describe, expect, it } from 'vitest';

import {
    consumeJoinToken,
    JOIN_TOKEN_TTL_SECONDS,
    mintJoinToken,
} from '@/modules/url-commands/join-token';

function memoryRedis() {
    const map = new Map<string, string>();
    return {
        async set(key: string, value: string) {
            map.set(key, value);
            return 'OK';
        },
        async get(key: string) {
            return map.get(key) ?? null;
        },
        async del(key: string) {
            return map.delete(key) ? 1 : 0;
        },
        async getdel(key: string) {
            const value = map.get(key) ?? null;
            map.delete(key);
            return value;
        },
    };
}

describe('joinToken', () => {
    it('mints a token that can be consumed once for that room', async () => {
        const redis = memoryRedis();
        const minted = await mintJoinToken(redis as never, '4821');
        expect(minted.roomId).toBe('4821');
        expect(minted.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
        expect(minted.exp).toBeLessThanOrEqual(
            Math.floor(Date.now() / 1000) + JOIN_TOKEN_TTL_SECONDS,
        );
        expect(await consumeJoinToken(redis as never, minted.joinToken, '4821')).toBe(true);
        expect(await consumeJoinToken(redis as never, minted.joinToken, '4821')).toBe(false);
    });

    it('rejects a token for a different room without burning it', async () => {
        const redis = memoryRedis();
        const minted = await mintJoinToken(redis as never, '4821');
        expect(await consumeJoinToken(redis as never, minted.joinToken, '9999')).toBe(false);
        expect(await consumeJoinToken(redis as never, minted.joinToken, '4821')).toBe(true);
    });

    it('admits only one of two concurrent consumes', async () => {
        const redis = memoryRedis();
        const minted = await mintJoinToken(redis as never, '4821');
        const results = await Promise.all([
            consumeJoinToken(redis as never, minted.joinToken, '4821'),
            consumeJoinToken(redis as never, minted.joinToken, '4821'),
        ]);
        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('rejects an invalid token without touching storage', async () => {
        const redis = memoryRedis();
        expect(await consumeJoinToken(redis as never, 'short', '4821')).toBe(false);
        expect(await consumeJoinToken(redis as never, 'abcdefgh', '12')).toBe(false);
    });

    it('fails closed on a corrupt payload and does not restore it', async () => {
        const redis = memoryRedis();
        const minted = await mintJoinToken(redis as never, '4821');
        const key = `join-token:${minted.joinToken}`;
        await redis.set(key, '{not-json');
        expect(await consumeJoinToken(redis as never, minted.joinToken, '4821')).toBe(false);
        expect(await redis.get(key)).toBeNull();
    });

    it('does not export a vault of other rooms', async () => {
        const redis = memoryRedis();
        const minted = await mintJoinToken(redis as never, '4821');
        expect(minted).not.toHaveProperty('secrets');
        expect(JSON.stringify(minted)).not.toContain('password');
    });
});
