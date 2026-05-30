import type { VideoCompact } from 'youtubei';
import type Redis from 'ioredis';

import type { YouTubeVideo } from '@vkara/shared-types';

import { getCachedChannel } from './channel-cache';
import type { ChannelWithId } from './channel-verified';

type ResolvedChannel = YouTubeVideo['channels'][number] & { id?: string };

const isVerifiedChannel = (channel: unknown): boolean => {
    if (!channel || typeof channel !== 'object') {
        return false;
    }

    const candidate = channel as {
        verified?: unknown;
        isVerified?: unknown;
        isOfficialArtistChannel?: unknown;
    };

    return Boolean(
        candidate.verified ?? candidate.isVerified ?? candidate.isOfficialArtistChannel ?? false,
    );
};

const resolveFromCache = async (
    redisClient: Redis,
    channelId: string,
    channelName: string,
    compactVerified: boolean,
    metadataVerified?: boolean,
): Promise<ResolvedChannel[]> => {
    const cached = await getCachedChannel(redisClient, channelId);
    const verified = Boolean(cached?.verified || compactVerified || metadataVerified);

    return [
        {
            id: channelId,
            name: channelName,
            verified,
        },
    ];
};

/** Search/related cards already include channel — avoid getVideo() per row (rate limits player API). */
export async function resolveCompactVideoChannels(
    video: VideoCompact,
    redisClient: Redis,
    metadataVerified?: boolean,
): Promise<ResolvedChannel[]> {
    if (!video.channel?.name) {
        return [];
    }

    if (!video.channel.id) {
        return [
            {
                name: video.channel.name,
                verified: isVerifiedChannel(video.channel) || metadataVerified === true,
            },
        ];
    }

    return resolveFromCache(
        redisClient,
        video.channel.id,
        video.channel.name,
        isVerifiedChannel(video.channel),
        metadataVerified,
    );
}

export const collectCompactChannelCandidates = (
    items: VideoCompact[],
    verifiedByVideoId: Map<string, boolean>,
): ChannelWithId[] =>
    items.flatMap((item) => {
        if (!item.channel?.id || !item.channel.name) {
            return [];
        }

        return [
            {
                id: item.channel.id,
                name: item.channel.name,
                verified:
                    isVerifiedChannel(item.channel) ||
                    verifiedByVideoId.get(item.id) === true,
            },
        ];
    });
