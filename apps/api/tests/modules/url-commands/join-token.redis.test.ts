import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
    consumeJoinToken,
    JOIN_TOKEN_TTL_SECONDS,
    mintJoinToken,
} from '@/modules/url-commands/join-token';

const host = process.env.REDIS_HOST ?? 'localhost';
const port = Number(process.env.REDIS_PORT ?? 6380);
const password = process.env.REDIS_PASSWORD || undefined;

function createClient() {
    return new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        enableReadyCheck: false,
    });
}

describe('joinToken against local Redis', () => {
    let redis: Redis;
    let available = false;

    beforeAll(async () => {
        redis = createClient();
        try {
            await redis.connect();
            await redis.ping();
            available = true;
        } catch {
            available = false;
        }
    });

    afterAll(async () => {
        if (available) {
            await redis.quit();
        } else {
            redis.disconnect();
        }
    });

    it('connects to the local Redis used by the API', () => {
        expect(available, `Redis not reachable at ${host}:${port}`).toBe(true);
    });

    it('mints, consumes once, and rejects a replay', async () => {
        if (!available) {
            return;
        }
        const minted = await mintJoinToken(redis, '4821');
        expect(minted.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
        expect(minted.exp).toBeLessThanOrEqual(
            Math.floor(Date.now() / 1000) + JOIN_TOKEN_TTL_SECONDS,
        );
        expect(await consumeJoinToken(redis, minted.joinToken, '4821')).toBe(true);
        expect(await consumeJoinToken(redis, minted.joinToken, '4821')).toBe(false);
    });

    it('does not burn a token presented for the wrong room', async () => {
        if (!available) {
            return;
        }
        const minted = await mintJoinToken(redis, '4821');
        expect(await consumeJoinToken(redis, minted.joinToken, '9999')).toBe(false);
        expect(await consumeJoinToken(redis, minted.joinToken, '4821')).toBe(true);
    });

    it('admits only one of many concurrent consumes', async () => {
        if (!available) {
            return;
        }
        const minted = await mintJoinToken(redis, '4821');
        const results = await Promise.all(
            Array.from({ length: 12 }, () => consumeJoinToken(redis, minted.joinToken, '4821')),
        );
        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('expires after TTL when minted with a 1s key', async () => {
        if (!available) {
            return;
        }
        const minted = await mintJoinToken(redis, '4821');
        const key = `join-token:${minted.joinToken}`;
        const raw = await redis.get(key);
        expect(raw).toBeTruthy();
        await redis.set(key, raw as string, 'EX', 1);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        expect(await consumeJoinToken(redis, minted.joinToken, '4821')).toBe(false);
    });
});
