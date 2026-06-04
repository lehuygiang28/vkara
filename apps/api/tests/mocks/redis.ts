import { vi } from 'vitest';
import type Redis from 'ioredis';

/**
 * In-memory Redis stub for Vitest. Prevents ioredis from connecting to localhost:6379
 * when modules import `@/redis` as a side effect of loading room-store, etc.
 */
export const redis = {
    get: vi.fn<Redis['get']>().mockResolvedValue(null),
    set: vi.fn<Redis['set']>().mockResolvedValue('OK'),
    del: vi.fn<Redis['del']>().mockResolvedValue(1),
    exists: vi.fn<Redis['exists']>().mockResolvedValue(0),
    hgetall: vi.fn<Redis['hgetall']>().mockResolvedValue({}),
    hset: vi.fn<Redis['hset']>().mockResolvedValue(1),
    hdel: vi.fn<Redis['hdel']>().mockResolvedValue(1),
    watch: vi.fn<Redis['watch']>().mockResolvedValue('OK'),
    unwatch: vi.fn<Redis['unwatch']>().mockResolvedValue('OK'),
    scan: vi.fn<Redis['scan']>().mockResolvedValue(['0', []]),
    multi: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
    })),
    on: vi.fn(),
    once: vi.fn(),
    disconnect: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;
