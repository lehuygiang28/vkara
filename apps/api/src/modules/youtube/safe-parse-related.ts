import { BaseVideoParser, type Client, type VideoCompact } from 'youtubei';

import { captureUnexpected } from '@/sentry';

import { asYoutubeRawData } from './youtubei-raw-data';

export const RELATED_PARSE_CAPTURE = {
    tags: { area: 'youtube', route: 'related', kind: 'parse' },
    level: 'warning' as const,
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
