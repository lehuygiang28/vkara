export type RedisConnectionOptions = {
    host: string;
    port: number;
    password?: string;
    maxRetriesPerRequest?: null;
};

type Env = Record<string, string | undefined>;

export function createRedisOptions(env: Env): RedisConnectionOptions {
    return {
        host: env.REDIS_HOST || 'localhost',
        port: env.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : 6379,
        password: env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
    };
}
