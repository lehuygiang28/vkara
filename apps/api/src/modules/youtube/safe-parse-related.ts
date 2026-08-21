import { BaseVideoParser, type Client, type VideoCompact } from 'youtubei';

import { captureUnexpected } from '@/sentry';

import { asYoutubeRawData } from './youtubei-raw-data';

export const RELATED_PARSE_CAPTURE = {
    tags: { area: 'youtube', route: 'related', kind: 'parse' },
    level: 'warning' as const,
};

type RelatedVideoShell = {
    related?: {
        items: unknown;
        continuation?: string | null;
    };
};

export function captureRelatedParseFailure(error: unknown): void {
    captureUnexpected(error, RELATED_PARSE_CAPTURE);
}

/** youtubei parseRelated throws on Innertube schema drift; related shelf should degrade. */
export function safeParseRelated(raw: unknown, client: Client): VideoCompact[] {
    try {
        return BaseVideoParser.parseRelated(asYoutubeRawData(raw), client) as VideoCompact[];
    } catch (error) {
        captureRelatedParseFailure(error);
        return [];
    }
}

/** youtubei parseContinuation throws on schema drift; pagination should stop, not 502. */
export function safeParseContinuation(raw: unknown): string | null | undefined {
    try {
        return BaseVideoParser.parseContinuation(asYoutubeRawData(raw));
    } catch (error) {
        captureRelatedParseFailure(error);
        return undefined;
    }
}

/** Prefer the loaded video related shell; otherwise parse items and continuation independently. */
export function resolveRelatedShelf(
    video: RelatedVideoShell | undefined,
    nextResponseData: unknown,
    client: Client,
): { items: VideoCompact[]; continuation: string | null | undefined } {
    if (video?.related) {
        return {
            items: video.related.items as VideoCompact[],
            continuation: video.related.continuation,
        };
    }
    return {
        items: safeParseRelated(nextResponseData, client),
        continuation: safeParseContinuation(nextResponseData),
    };
}
