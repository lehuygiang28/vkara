export type SearchConfig = {
    sessionTtlMs: number;
    pageSize: number;
    maxDeviceSessions: number;
    pruneIntervalMs: number;
};

const DEFAULTS = {
    sessionTtlSeconds: 600,
    pageSize: 12,
    maxDeviceSessions: 32,
    pruneIntervalSeconds: 60,
} as const;

function parsePositiveInt(value: string | undefined, fallback: number): number {
    if (!value?.trim()) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** TikTok search session tunables from `VKARA_TIKTOK_SEARCH_*` env vars. */
export function getSearchConfig(env: NodeJS.ProcessEnv = process.env): SearchConfig {
    return {
        sessionTtlMs:
            parsePositiveInt(
                env.VKARA_TIKTOK_SEARCH_SESSION_TTL_SECONDS,
                DEFAULTS.sessionTtlSeconds,
            ) * 1000,
        pageSize: parsePositiveInt(env.VKARA_TIKTOK_SEARCH_PAGE_SIZE, DEFAULTS.pageSize),
        maxDeviceSessions: parsePositiveInt(
            env.VKARA_TIKTOK_SEARCH_MAX_DEVICE_SESSIONS,
            DEFAULTS.maxDeviceSessions,
        ),
        pruneIntervalMs:
            parsePositiveInt(
                env.VKARA_TIKTOK_SEARCH_PRUNE_INTERVAL_SECONDS,
                DEFAULTS.pruneIntervalSeconds,
            ) * 1000,
    };
}
