import type Redis from 'ioredis';

import { createRedisJsonCache } from '@vkara/cache-redis';

const CHANNEL_CACHE_TTL_SECONDS = 60 * 60 * 24;
const CHANNEL_CACHE_PREFIX = 'youtube-channel:';

export interface CachedChannel {
    id: string;
    name: string;
    verified: boolean;
}

const channelJsonCache = createRedisJsonCache<CachedChannel>((parsed) => {
    if (typeof parsed !== 'object' || parsed === null) {
        return undefined;
    }

    const candidate = parsed as Record<string, unknown>;
    if (
        typeof candidate.id === 'string' &&
        candidate.id !== '' &&
        typeof candidate.name === 'string' &&
        candidate.name !== '' &&
        typeof candidate.verified === 'boolean'
    ) {
        return {
            id: candidate.id,
            name: candidate.name,
            verified: candidate.verified,
        };
    }

    return undefined;
});

const getChannelCacheKey = (channelId: string): string => `${CHANNEL_CACHE_PREFIX}${channelId}`;

export const getCachedChannel = async (
    redisClient: Redis,
    channelId: string,
): Promise<CachedChannel | undefined> => {
    return channelJsonCache.get(redisClient, getChannelCacheKey(channelId));
};

export const setCachedChannel = async (
    redisClient: Redis,
    channel: CachedChannel,
): Promise<void> => {
    const existing = await getCachedChannel(redisClient, channel.id);
    const mergedChannel: CachedChannel = existing
        ? {
              ...channel,
              // Never downgrade verified=true to false.
              verified: existing.verified || channel.verified,
          }
        : channel;

    await channelJsonCache.set(
        redisClient,
        getChannelCacheKey(channel.id),
        mergedChannel,
        CHANNEL_CACHE_TTL_SECONDS,
    );
};
