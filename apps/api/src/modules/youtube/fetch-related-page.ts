import { BaseVideoParser, Client, SearchResult, type VideoCompact } from 'youtubei';

import { extractRendererMetadata, type RendererMetadataMaps } from './renderer-metadata';
import { postInnertube } from './innertube-post';
import { asYoutubeRawData } from './youtubei-raw-data';

const NEXT_ENDPOINT = '/youtubei/v1/next';

export type RelatedPageFetchResult = {
    items: VideoCompact[];
    continuation: string | null | undefined;
    metadata: RendererMetadataMaps;
};

/** Related shelf pagination without getVideo() (2 calls saved on cache miss). */
export async function fetchRelatedContinuationPage(
    client: Client,
    continuation: string,
): Promise<RelatedPageFetchResult> {
    const response = await postInnertube(client, NEXT_ENDPOINT, { continuation });
    const rawData = asYoutubeRawData(response.data);
    const metadata = extractRendererMetadata(rawData);
    const items = BaseVideoParser.parseRelated(rawData, client) as VideoCompact[];
    const nextContinuation = BaseVideoParser.parseContinuation(rawData);

    return {
        items,
        continuation: nextContinuation,
        metadata,
    };
}

/** Minimal SearchResult shell for continuation token caching (related uses same map type). */
export const createRelatedContinuationCache = (
    client: Client,
    items: VideoCompact[],
    continuation: string | null | undefined,
): SearchResult<'video'> => {
    const shell = new SearchResult<'video'>({ client });
    shell.items = items;
    shell.continuation = continuation;
    return shell;
};
