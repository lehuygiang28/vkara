import type Redis from 'ioredis';

export const SESSION_CREATE_PER_MIN = 5;
export const SESSION_CREATE_PER_HOUR = 20;
export const MUTATIONS_PER_SESSION_MIN = 10;
export const MUTATIONS_PER_IP_MIN = 20;
export const MINT_PER_IP_MIN = 5;
export const WS_MINT_PER_ROOM_MIN = 10;

export const YOUTUBE_CIRCUIT_WINDOW_SECONDS = 30;
export const YOUTUBE_CIRCUIT_THRESHOLD = 5;
export const YOUTUBE_CIRCUIT_OPEN_SECONDS = 60;

export class RateLimitedError extends Error {
    readonly status = 429;

    constructor() {
        super('rate limited');
        this.name = 'RateLimitedError';
    }
}

export class CircuitOpenError extends Error {
    readonly status = 503;

    constructor() {
        super('upstream circuit open');
        this.name = 'CircuitOpenError';
    }
}

async function hitWindow(
    redis: Redis,
    key: string,
    limit: number,
    ttlSeconds: number,
): Promise<boolean> {
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, ttlSeconds);
    }
    return count <= limit;
}

export async function assertSessionCreateBudget(redis: Redis, ip: string): Promise<void> {
    const minuteOk = await hitWindow(redis, `rl:session:ip:${ip}:m`, SESSION_CREATE_PER_MIN, 60);
    const hourOk = await hitWindow(redis, `rl:session:ip:${ip}:h`, SESSION_CREATE_PER_HOUR, 3600);
    if (!minuteOk || !hourOk) {
        throw new RateLimitedError();
    }
}

export async function assertMintBudget(redis: Redis, ip: string): Promise<void> {
    const ok = await hitWindow(redis, `rl:mint:ip:${ip}:m`, MINT_PER_IP_MIN, 60);
    if (!ok) {
        throw new RateLimitedError();
    }
}

export async function assertWsMintBudget(redis: Redis, roomId: string): Promise<void> {
    const ok = await hitWindow(redis, `rl:mint:ws:${roomId}:m`, WS_MINT_PER_ROOM_MIN, 60);
    if (!ok) {
        throw new RateLimitedError();
    }
}

export async function assertMutationBudget(
    redis: Redis,
    sessionToken: string,
    ip: string,
): Promise<void> {
    const sessionOk = await hitWindow(
        redis,
        `rl:mut:session:${sessionToken}:m`,
        MUTATIONS_PER_SESSION_MIN,
        60,
    );
    const ipOk = await hitWindow(redis, `rl:mut:ip:${ip}:m`, MUTATIONS_PER_IP_MIN, 60);
    if (!sessionOk || !ipOk) {
        throw new RateLimitedError();
    }
}

export async function isYoutubeCircuitOpen(redis: Redis): Promise<boolean> {
    return (await redis.exists('youtube-circuit:open')) === 1;
}

export async function recordYoutubeFailure(redis: Redis): Promise<void> {
    const count = await redis.incr('youtube-circuit:fails');
    if (count === 1) {
        await redis.expire('youtube-circuit:fails', YOUTUBE_CIRCUIT_WINDOW_SECONDS);
    }
    if (count >= YOUTUBE_CIRCUIT_THRESHOLD) {
        await redis.set('youtube-circuit:open', '1', 'EX', YOUTUBE_CIRCUIT_OPEN_SECONDS);
    }
}

export async function assertYoutubeCircuitClosed(redis: Redis): Promise<void> {
    if (await isYoutubeCircuitOpen(redis)) {
        throw new CircuitOpenError();
    }
}
