import type { Client } from 'youtubei';
import { parseYoutubeViewCountText } from '@vkara/shared-utils';

const VERIFIED_BADGE_STYLES = new Set([
    'BADGE_STYLE_TYPE_VERIFIED',
    'BADGE_STYLE_TYPE_VERIFIED_ARTIST',
]);

export interface RendererMetadataMaps {
    verifiedByVideoId: Map<string, boolean>;
    viewCountByVideoId: Map<string, number>;
}

const hasVerifiedOwnerBadge = (ownerBadges: unknown[] = []): boolean =>
    ownerBadges.some((badge) => {
        const style = (badge as { metadataBadgeRenderer?: { style?: string } })
            ?.metadataBadgeRenderer?.style;
        return VERIFIED_BADGE_STYLES.has(style ?? '');
    });

type TextRunSource = {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
    content?: string;
};

type CompactVideoRenderer = {
    videoId?: string;
    ownerBadges?: unknown[];
    viewCountText?: TextRunSource;
    shortViewCountText?: TextRunSource;
};

const joinTextSource = (source?: TextRunSource): string | undefined => {
    if (!source) {
        return undefined;
    }

    if (typeof source.content === 'string' && source.content.length > 0) {
        return source.content;
    }

    if (typeof source.simpleText === 'string' && source.simpleText.length > 0) {
        return source.simpleText;
    }

    if (source.runs?.length) {
        const joined = source.runs.map((run) => run.text ?? '').join('');
        return joined.length > 0 ? joined : undefined;
    }

    return undefined;
};

const getVideoRenderer = (node: Record<string, unknown>): CompactVideoRenderer | undefined =>
    (node.videoRenderer ?? node.compactVideoRenderer) as CompactVideoRenderer | undefined;

const extractViewCountText = (renderer: CompactVideoRenderer): string | undefined =>
    joinTextSource(renderer.viewCountText) ?? joinTextSource(renderer.shortViewCountText);

const setParsedViewCount = (
    maps: RendererMetadataMaps,
    videoId: string,
    viewCountText: string | undefined,
): void => {
    if (!viewCountText) {
        return;
    }

    const parsed = parseYoutubeViewCountText(viewCountText);
    if (parsed !== null && parsed > 0) {
        maps.viewCountByVideoId.set(videoId, parsed);
    }
};

type LockupMetadataRows = Array<{
    metadataParts?: Array<{ text?: TextRunSource }>;
}>;

const getLockupMetadataRows = (lockup: Record<string, unknown>): LockupMetadataRows | undefined =>
    (
        lockup.metadata as
            | {
                  lockupMetadataViewModel?: {
                      metadata?: {
                          contentMetadataViewModel?: {
                              metadataRows?: LockupMetadataRows;
                          };
                      };
                  };
              }
            | undefined
    )?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;

const looksLikeUploadDate = (text: string): boolean =>
    /\b(ago|hour|day|week|month|year|streamed|yesterday|today)\b/i.test(text);

const extractLockupViewCountText = (lockup: Record<string, unknown>): string | undefined => {
    const metadataParts = getLockupMetadataRows(lockup)?.[1]?.metadataParts;
    if (!metadataParts?.length) {
        return undefined;
    }

    if (metadataParts.length === 1) {
        return joinTextSource(metadataParts[0]?.text);
    }

    const lastText = joinTextSource(metadataParts.at(-1)?.text) ?? '';
    const viewParts = looksLikeUploadDate(lastText) ? metadataParts.slice(0, -1) : metadataParts;
    const joined = viewParts
        .map((part) => joinTextSource(part.text))
        .filter((text): text is string => Boolean(text))
        .join('');

    return joined || undefined;
};

const collectLockupMetadata = (
    lockup: Record<string, unknown>,
    maps: RendererMetadataMaps,
): void => {
    if (lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') {
        return;
    }

    const videoId = typeof lockup.contentId === 'string' ? lockup.contentId : undefined;
    if (!videoId) {
        return;
    }

    setParsedViewCount(maps, videoId, extractLockupViewCountText(lockup));
};

/** Extract renderer metadata from a raw YouTube InnerTube response payload. */
export const extractRendererMetadata = (data: unknown): RendererMetadataMaps => {
    const maps: RendererMetadataMaps = {
        verifiedByVideoId: new Map(),
        viewCountByVideoId: new Map(),
    };
    collectRendererMetadata(data, maps);
    return maps;
};

const collectRendererMetadata = (node: unknown, maps: RendererMetadataMaps): void => {
    if (!node || typeof node !== 'object') {
        return;
    }

    if (Array.isArray(node)) {
        node.forEach((item) => collectRendererMetadata(item, maps));
        return;
    }

    const record = node as Record<string, unknown>;

    if (record.lockupViewModel && typeof record.lockupViewModel === 'object') {
        collectLockupMetadata(record.lockupViewModel as Record<string, unknown>, maps);
    }

    const renderer = getVideoRenderer(record);
    const videoId = renderer?.videoId;

    if (videoId) {
        const isVerified = hasVerifiedOwnerBadge(renderer.ownerBadges);
        maps.verifiedByVideoId.set(videoId, maps.verifiedByVideoId.get(videoId) || isVerified);
        setParsedViewCount(maps, videoId, extractViewCountText(renderer));
    }

    for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
            collectRendererMetadata(value, maps);
        }
    }
};

const fetchRendererMetadata = async (
    client: Client,
    endpoint: '/youtubei/v1/search' | '/youtubei/v1/next',
    payload: Record<string, string>,
): Promise<RendererMetadataMaps> => {
    try {
        const response = await client.http.post(endpoint, { data: payload });
        return extractRendererMetadata(response?.data);
    } catch {
        // Return empty maps — callers fall back to youtubei compact fields.
        return { verifiedByVideoId: new Map(), viewCountByVideoId: new Map() };
    }
};

export const getSearchRendererMetadata = async ({
    client,
    query,
    continuation,
}: {
    client: Client;
    query?: string;
    continuation?: string;
}): Promise<RendererMetadataMaps> => {
    if (!query && !continuation) {
        return { verifiedByVideoId: new Map(), viewCountByVideoId: new Map() };
    }

    const payload: Record<string, string> = continuation ? { continuation } : { query: query! };
    return fetchRendererMetadata(client, '/youtubei/v1/search', payload);
};

export const getRelatedRendererMetadata = async ({
    client,
    videoId,
    continuation,
}: {
    client: Client;
    videoId?: string;
    continuation?: string;
}): Promise<RendererMetadataMaps> => {
    if (!videoId && !continuation) {
        return { verifiedByVideoId: new Map(), viewCountByVideoId: new Map() };
    }

    const payload: Record<string, string> = continuation ? { continuation } : { videoId: videoId! };
    return fetchRendererMetadata(client, '/youtubei/v1/next', payload);
};
