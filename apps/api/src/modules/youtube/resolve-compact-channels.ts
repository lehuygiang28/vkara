import type { Client, VideoCompact } from 'youtubei';
import type Redis from 'ioredis';

import type { YouTubeVideo } from '@vkara/shared-types';

import { enrichChannelsVerified } from './channel-verified';

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

/** Search/related cards already include channel — avoid getVideo() per row (rate limits player API). */
export async function resolveCompactVideoChannels(
    video: VideoCompact,
    redisClient: Redis,
    youtubeiClient: Client,
): Promise<ResolvedChannel[]> {
    if (!video.channel?.name) {
        return [];
    }

    const primary: ResolvedChannel = {
        id: video.channel.id,
        name: video.channel.name,
        verified: isVerifiedChannel(video.channel),
    };

    return enrichChannelsVerified(redisClient, youtubeiClient, [primary]);
}
