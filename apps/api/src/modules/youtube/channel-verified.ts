import type { Client } from 'youtubei';
import type Redis from 'ioredis';

import { getCachedChannel, setCachedChannel } from './channel-cache';

const VERIFIED_ACCESSIBILITY_LABEL =
    /verified|official artist channel/i;

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

export const getChannelVerifiedFromBrowsePayload = (data: unknown): boolean => {
    const label = (data as BrowsePayload)?.header?.pageHeaderRenderer?.content
        ?.pageHeaderViewModel?.title?.dynamicTextViewModel?.rendererContext
        ?.accessibilityContext?.label;

    return typeof label === 'string' && VERIFIED_ACCESSIBILITY_LABEL.test(label);
};

export const fetchChannelVerifiedFromBrowse = async (
    client: Client,
    channelId: string,
): Promise<boolean> => {
    const response = await client.http.post('/youtubei/v1/browse', {
        data: { browseId: channelId },
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

    try {
        const fromBrowse = await fetchChannelVerifiedFromBrowse(client, channelId);
        const verified = Boolean(cached?.verified || fromBrowse);
        await setCachedChannel(redisClient, {
            id: channelId,
            name: channelName || cached?.name || channelId,
            verified,
        });
        return verified;
    } catch {
        return Boolean(cached?.verified);
    }
};

export type ChannelWithId = {
    id?: string;
    name: string;
    verified: boolean;
};

export const enrichChannelsVerified = async (
    redisClient: Redis,
    client: Client,
    channels: ChannelWithId[],
): Promise<ChannelWithId[]> =>
    Promise.all(
        channels.map(async (channel) => {
            if (!channel.id) {
                return channel;
            }

            const verified = await resolveChannelVerified(
                redisClient,
                client,
                channel.id,
                channel.name,
                channel.verified,
            );
            return { ...channel, verified };
        }),
    );
