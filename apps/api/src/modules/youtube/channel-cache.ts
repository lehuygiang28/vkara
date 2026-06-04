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
    if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'id' in parsed &&
        'name' in parsed &&
        'verified' in parsed
    ) {
        const candidate = parsed as CachedChannel;
        if (candidate.id && candidate.name && typeof candidate.verified === 'boolean') {
            return candidate;
        }
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
