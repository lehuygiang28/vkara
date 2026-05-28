import type { Client } from 'youtubei';

const VERIFIED_BADGE_STYLES = new Set([
    'BADGE_STYLE_TYPE_VERIFIED',
    'BADGE_STYLE_TYPE_VERIFIED_ARTIST',
]);

const hasVerifiedOwnerBadge = (ownerBadges: unknown[] = []): boolean =>
    ownerBadges.some((badge: any) =>
        VERIFIED_BADGE_STYLES.has(badge?.metadataBadgeRenderer?.style ?? ''),
    );

const getVideoRenderer = (
    node: any,
): { videoId?: string; ownerBadges?: unknown[] } | undefined =>
    node?.videoRenderer ?? node?.compactVideoRenderer;

const collectVerifiedByVideoId = (node: any, map: Map<string, boolean>): void => {
    if (!node || typeof node !== 'object') {
        return;
    }

    if (Array.isArray(node)) {
        node.forEach((item) => collectVerifiedByVideoId(item, map));
        return;
    }

    const renderer = getVideoRenderer(node);
    const videoId = renderer?.videoId;
    if (videoId) {
        const isVerified = hasVerifiedOwnerBadge(renderer.ownerBadges);
        const previous = map.get(videoId) ?? false;
        map.set(videoId, previous || isVerified);
    }

    for (const value of Object.values(node)) {
        if (value && typeof value === 'object') {
            collectVerifiedByVideoId(value, map);
        }
    }
};

export const getSearchVerifiedMap = async ({
    client,
    query,
    continuation,
}: {
    client: Client;
    query?: string;
    continuation?: string;
}): Promise<Map<string, boolean>> => {
    if (!query && !continuation) {
        return new Map();
    }

    try {
        const payload = continuation ? { continuation } : { query };
        const response = await client.http.post('/youtubei/v1/search', { data: payload });
        const map = new Map<string, boolean>();
        collectVerifiedByVideoId(response?.data, map);
        return map;
    } catch {
        return new Map();
    }
};

export const getRelatedVerifiedMap = async ({
    client,
    videoId,
    continuation,
}: {
    client: Client;
    videoId?: string;
    continuation?: string;
}): Promise<Map<string, boolean>> => {
    if (!videoId && !continuation) {
        return new Map();
    }

    try {
        const payload = continuation ? { continuation } : { videoId };
        const response = await client.http.post('/youtubei/v1/next', { data: payload });
        const map = new Map<string, boolean>();
        collectVerifiedByVideoId(response?.data, map);
        return map;
    } catch {
        return new Map();
    }
};
