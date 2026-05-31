import type { Client, VideoCompact } from 'youtubei';
import type Redis from 'ioredis';

import type { YouTubeVideo } from '@vkara/shared-types';

import { getCachedChannel } from './channel-cache';
import { resolveChannelVerified, type ChannelWithId } from './channel-verified';
import { createInFlightDedup } from './in-flight-dedup';

type ResolvedChannel = YouTubeVideo['channels'][number] & { id?: string };

const fullVideoChannelsInFlight = createInFlightDedup<string, ResolvedChannel[]>();

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

async function resolveChannelEntry(
    redisClient: Redis,
    client: Client,
    channel: { id?: string; name?: string },
    options: { metadataVerified?: boolean; compactVerified: boolean },
): Promise<ResolvedChannel | null> {
    if (!channel.name) {
        return null;
    }

    if (!channel.id) {
        return {
            name: channel.name,
            verified: options.compactVerified,
        };
    }

    const [resolved] = await resolveFromCache(
        redisClient,
        channel.id,
        channel.name,
        options.compactVerified,
        options.metadataVerified,
    );

    const verified = await resolveChannelVerified(
        redisClient,
        client,
        channel.id,
        channel.name,
        resolved?.verified ?? options.compactVerified,
    );

    return {
        id: channel.id,
        name: channel.name,
        verified,
    };
}

/** Collab / lockup cards may omit compact `channel`; full video exposes `channels[]`. */
async function resolveFromFullVideo(
    client: Client,
    redisClient: Redis,
    video: VideoCompact,
    metadataVerified?: boolean,
): Promise<ResolvedChannel[]> {
    return fullVideoChannelsInFlight.run(video.id, async () => {
        try {
            const full = await video.getVideo();
            const source =
                full.channels?.filter((channel) => channel?.name) ??
                (full.channel?.name ? [full.channel] : []);

            if (source.length === 0) {
                return [];
            }

            const resolved = await Promise.all(
                source.map((channel, index) =>
                    resolveChannelEntry(redisClient, client, channel, {
                        metadataVerified: index === 0 ? metadataVerified : undefined,
                        compactVerified:
                            isVerifiedChannel(channel) ||
                            (index === 0 && metadataVerified === true),
                    }),
                ),
            );

            return resolved.filter((channel): channel is ResolvedChannel => channel !== null);
        } catch {
            return [];
        }
    });
}

export async function resolveCompactVideoChannels(
    video: VideoCompact,
    redisClient: Redis,
    metadataVerified?: boolean,
    client?: Client,
): Promise<ResolvedChannel[]> {
    if (!video.channel?.name) {
        if (!client) {
            return [];
        }

        return resolveFromFullVideo(client, redisClient, video, metadataVerified);
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
