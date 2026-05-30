import type { Client } from 'youtubei';
import type Redis from 'ioredis';

import { getCachedChannel, setCachedChannel } from './channel-cache';
import { createInFlightDedup } from './in-flight-dedup';
import { postInnertube } from './innertube-post';

const VERIFIED_ACCESSIBILITY_LABEL = /verified|official artist channel/i;

const channelBrowseInFlight = createInFlightDedup<string, boolean>();

type BrowsePayload = {
    header?: {
        pageHeaderRenderer?: {
            content?: {
                pageHeaderViewModel?: {
                    title?: {
                        dynamicTextViewModel?: {
                            rendererContext?: {
                                accessibilityContext?: {
                                    label?: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};

const getChannelVerifiedFromBrowsePayload = (data: unknown): boolean => {
    const label = (data as BrowsePayload)?.header?.pageHeaderRenderer?.content
        ?.pageHeaderViewModel?.title?.dynamicTextViewModel?.rendererContext
        ?.accessibilityContext?.label;

    return typeof label === 'string' && VERIFIED_ACCESSIBILITY_LABEL.test(label);
};

const fetchChannelVerifiedFromBrowse = async (
    client: Client,
    channelId: string,
): Promise<boolean> => {
    const response = await postInnertube(client, '/youtubei/v1/browse', {
        browseId: channelId,
    });
    return getChannelVerifiedFromBrowsePayload(response?.data);
};

export const resolveChannelVerified = async (
    redisClient: Redis,
    client: Client,
    channelId: string,
    channelName: string,
    currentVerified = false,
): Promise<boolean> => {
    if (currentVerified) {
        await setCachedChannel(redisClient, {
            id: channelId,
            name: channelName,
            verified: true,
        });
        return true;
    }

    const cached = await getCachedChannel(redisClient, channelId);
    if (cached?.verified) {
        return true;
    }

    return channelBrowseInFlight.run(channelId, async () => {
        const cachedAgain = await getCachedChannel(redisClient, channelId);
        if (cachedAgain?.verified) {
            return true;
        }

        try {
            const fromBrowse = await fetchChannelVerifiedFromBrowse(client, channelId);
            const verified = Boolean(cachedAgain?.verified || fromBrowse);
            await setCachedChannel(redisClient, {
                id: channelId,
                name: channelName || cachedAgain?.name || channelId,
                verified,
            });
            return verified;
        } catch {
            return Boolean(cachedAgain?.verified);
        }
    });
};

export type ChannelWithId = {
    id?: string;
    name: string;
    verified: boolean;
};

/** Prefetch unique channels once per batch (avoids N parallel browse calls for same channel). */
export const prefetchUniqueChannelVerified = async (
    redisClient: Redis,
    client: Client,
    channels: ChannelWithId[],
): Promise<void> => {
    const unique = new Map<string, ChannelWithId>();

    for (const channel of channels) {
        if (!channel.id) {
            continue;
        }

        const existing = unique.get(channel.id);
        unique.set(channel.id, {
            id: channel.id,
            name: channel.name,
            verified: Boolean(existing?.verified || channel.verified),
        });
    }

    await Promise.all(
        [...unique.values()].map((channel) =>
            resolveChannelVerified(
                redisClient,
                client,
                channel.id!,
                channel.name,
                channel.verified,
            ),
        ),
    );
};
