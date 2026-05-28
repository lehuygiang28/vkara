import type Redis from 'ioredis';

const CHANNEL_CACHE_TTL_SECONDS = 60 * 60 * 24;
const CHANNEL_CACHE_PREFIX = 'youtube-channel:';

export interface CachedChannel {
    id: string;
    name: string;
    verified: boolean;
}

const getChannelCacheKey = (channelId: string): string => `${CHANNEL_CACHE_PREFIX}${channelId}`;

export const getCachedChannel = async (
    redisClient: Redis,
    channelId: string,
): Promise<CachedChannel | undefined> => {
    const payload = await redisClient.get(getChannelCacheKey(channelId));
    if (!payload) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(payload) as CachedChannel;
        if (!parsed?.id || !parsed?.name || typeof parsed.verified !== 'boolean') {
            return undefined;
        }
        return parsed;
    } catch {
        return undefined;
    }
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

    await redisClient.set(
        getChannelCacheKey(channel.id),
        JSON.stringify(mergedChannel),
        'EX',
        CHANNEL_CACHE_TTL_SECONDS,
    );
};
