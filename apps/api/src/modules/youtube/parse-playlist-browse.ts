import { VideoCompact, type Client } from 'youtubei';

import { asYoutubeRawData } from './youtubei-raw-data';

const CONTINUATION_RESPONSE_KEYS = [
    'onResponseReceivedActions',
    'onResponseReceivedCommands',
    'onResponseReceivedEndpoints',
] as const;

function asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value as Record<string, unknown>;
}

function collectSectionItems(raw: unknown): unknown[] {
    const items: unknown[] = [];
    const data = asRecord(raw);
    if (!data) {
        return items;
    }

    const twoColumn = asRecord(asRecord(data.contents)?.twoColumnBrowseResultsRenderer);
    const tabs = Array.isArray(twoColumn?.tabs) ? twoColumn.tabs : [];

    for (const tab of tabs) {
        const sectionList = asRecord(
            asRecord(asRecord(asRecord(tab)?.tabRenderer)?.content)?.sectionListRenderer,
        );
        const sections = Array.isArray(sectionList?.contents) ? sectionList.contents : [];

        for (const section of sections) {
            const sectionRecord = asRecord(section);
            const itemSection = asRecord(sectionRecord?.itemSectionRenderer);
            if (Array.isArray(itemSection?.contents)) {
                items.push(...itemSection.contents);
            }

            const richGrid = asRecord(sectionRecord?.richGridRenderer);
            if (Array.isArray(richGrid?.contents)) {
                items.push(...richGrid.contents);
            }
        }
    }

    for (const key of CONTINUATION_RESPONSE_KEYS) {
        const entries = data[key];
        if (!Array.isArray(entries)) {
            continue;
        }

        for (const entry of entries) {
            const continuationItems = asRecord(entry)?.appendContinuationItemsAction;
            const pageItems = asRecord(continuationItems)?.continuationItems;
            if (Array.isArray(pageItems)) {
                items.push(...pageItems);
            }
        }
    }

    return items;
}

function tokenFromContinuationRenderer(renderer: unknown): string | undefined {
    const endpoint = asRecord(asRecord(renderer)?.continuationEndpoint);
    if (!endpoint) {
        return undefined;
    }

    const direct = asRecord(endpoint.continuationCommand);
    if (typeof direct?.token === 'string' && direct.token.length > 0) {
        return direct.token;
    }

    const commands = asRecord(endpoint.commandExecutorCommand)?.commands;
    if (!Array.isArray(commands)) {
        return undefined;
    }

    for (const command of commands) {
        const token = asRecord(asRecord(command)?.continuationCommand)?.token;
        if (typeof token === 'string' && token.length > 0) {
            return token;
        }
    }

    return undefined;
}

function findContinuationToken(node: unknown): string | undefined {
    if (!node || typeof node !== 'object') {
        return undefined;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            const token = findContinuationToken(item);
            if (token) {
                return token;
            }
        }
        return undefined;
    }

    const record = node as Record<string, unknown>;
    if (record.continuationItemRenderer) {
        const token = tokenFromContinuationRenderer(record.continuationItemRenderer);
        if (token) {
            return token;
        }
    }

    for (const value of Object.values(record)) {
        const token = findContinuationToken(value);
        if (token) {
            return token;
        }
    }

    return undefined;
}

function parseLockupVideo(lockup: Record<string, unknown>, client: Client): VideoCompact | null {
    if (lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') {
        return null;
    }

    try {
        return new VideoCompact({ client }).loadLockup(asYoutubeRawData(lockup));
    } catch {
        const contentId = typeof lockup.contentId === 'string' ? lockup.contentId : undefined;
        if (!contentId) {
            return null;
        }

        const title = asRecord(asRecord(lockup.metadata)?.lockupMetadataViewModel)?.title;
        const titleContent = asRecord(title)?.content;

        return new VideoCompact({
            client,
            id: contentId,
            title: typeof titleContent === 'string' ? titleContent : 'Untitled',
            duration: 0,
        });
    }
}

function parsePlaylistContentItem(item: unknown, client: Client): VideoCompact | null {
    const record = asRecord(item);
    if (!record) {
        return null;
    }

    const richContent = asRecord(asRecord(record.richItemRenderer)?.content);
    if (richContent) {
        const nested = parsePlaylistContentItem(richContent, client);
        if (nested) {
            return nested;
        }
    }

    const lockup = asRecord(record.lockupViewModel);
    if (lockup) {
        return parseLockupVideo(lockup, client);
    }

    const playlistVideo = record.playlistVideoRenderer;
    if (playlistVideo) {
        try {
            return new VideoCompact({ client }).load(asYoutubeRawData(playlistVideo));
        } catch {
            return null;
        }
    }

    return null;
}

/** Parse playlist browse/continuation payloads that use lockupViewModel rows. */
export function parsePlaylistBrowseVideos(raw: unknown, client: Client): VideoCompact[] {
    const videos: VideoCompact[] = [];

    for (const item of collectSectionItems(raw)) {
        const video = parsePlaylistContentItem(item, client);
        if (video) {
            videos.push(video);
        }
    }

    return videos;
}

export function parsePlaylistBrowseContinuation(raw: unknown): string | undefined {
    return findContinuationToken(raw);
}
