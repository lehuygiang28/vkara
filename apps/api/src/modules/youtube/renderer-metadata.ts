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

const getVideoRenderer = (node: Record<string, unknown>) =>
    (node.videoRenderer ?? node.compactVideoRenderer) as
        | {
              videoId?: string;
              ownerBadges?: unknown[];
              viewCountText?: { simpleText?: string; runs?: Array<{ text?: string }> };
          }
        | undefined;

const extractViewCountText = (renderer: {
    viewCountText?: { simpleText?: string; runs?: Array<{ text?: string }> };
}): string | undefined =>
    renderer.viewCountText?.simpleText ?? renderer.viewCountText?.runs?.[0]?.text;

const collectRendererMetadata = (node: unknown, maps: RendererMetadataMaps): void => {
    if (!node || typeof node !== 'object') {
        return;
    }

    if (Array.isArray(node)) {
        node.forEach((item) => collectRendererMetadata(item, maps));
        return;
    }

    const record = node as Record<string, unknown>;
    const renderer = getVideoRenderer(record);
    const videoId = renderer?.videoId;

    if (videoId) {
        const isVerified = hasVerifiedOwnerBadge(renderer.ownerBadges);
        maps.verifiedByVideoId.set(videoId, maps.verifiedByVideoId.get(videoId) || isVerified);

        const viewCountText = renderer ? extractViewCountText(renderer) : undefined;
        if (viewCountText) {
            const parsed = parseYoutubeViewCountText(viewCountText);
            if (parsed !== null && parsed > 0) {
                maps.viewCountByVideoId.set(videoId, parsed);
            }
        }
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
    const maps: RendererMetadataMaps = {
        verifiedByVideoId: new Map(),
        viewCountByVideoId: new Map(),
    };

    try {
        const response = await client.http.post(endpoint, { data: payload });
        collectRendererMetadata(response?.data, maps);
    } catch {
        // Return empty maps — callers fall back to youtubei compact fields.
    }

    return maps;
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
