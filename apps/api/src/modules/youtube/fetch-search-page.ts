import {
    Client,
    SearchResult,
    SearchResultParser,
    type SearchOptions,
    type VideoCompact,
} from 'youtubei';
import { SearchProto, optionsToProto } from 'youtubei/dist/esm/youtube/SearchResult/proto/index.js';

import { extractRendererMetadata, type RendererMetadataMaps } from './renderer-metadata';
import { postInnertube } from './innertube-post';
import { asYoutubeRawData } from './youtubei-raw-data';
import { createContextLogger } from '@/utils/logger';

const logger = createContextLogger('FetchSearchPage');

const SEARCH_ENDPOINT = '/youtubei/v1/search';

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
    type: 'video',
    sortBy: 'relevance',
};

export type SearchPageFetchResult = {
    items: VideoCompact[];
    continuation: string | null | undefined;
    metadata: RendererMetadataMaps;
    searchResult: SearchResult<'video'>;
};

const hydrateSearchResult = (
    client: Client,
    items: VideoCompact[],
    continuation: string | null | undefined,
    estimatedResults = 0,
): SearchResult<'video'> => {
    const searchResult = new SearchResult<'video'>({ client });
    searchResult.items = items;
    searchResult.continuation = continuation;
    searchResult.estimatedResults = estimatedResults;
    return searchResult;
};

const emptySearchPage = (
    client: Client,
    existingResult?: SearchResult<'video'>,
): SearchPageFetchResult => {
    const searchResult = existingResult ?? hydrateSearchResult(client, [], null);
    searchResult.continuation = null;

    return {
        items: [],
        continuation: null,
        metadata: extractRendererMetadata(undefined),
        searchResult,
    };
};

/** First search page: one InnerTube call → items + renderer metadata. */
export async function fetchSearchInitialPage(
    client: Client,
    query: string,
    options: SearchOptions = DEFAULT_SEARCH_OPTIONS,
): Promise<SearchPageFetchResult> {
    const bufferParams = SearchProto.encode(optionsToProto(options)).finish();
    const response = await postInnertube(client, SEARCH_ENDPOINT, {
        query,
        params: Buffer.from(bufferParams).toString('base64'),
    });

    const metadata = extractRendererMetadata(response.data);
    let items: VideoCompact[] = [];
    let continuation: string | null | undefined;

    const estimatedResults = Number(
        (response.data as { estimatedResults?: string | number })?.estimatedResults ?? 0,
    );

    if (estimatedResults > 0) {
        try {
            const rawData = asYoutubeRawData(response.data);
            const parsed = SearchResultParser.parseInitialSearchResult(rawData, client);
            items = parsed.data as VideoCompact[];
            continuation = parsed.continuation;
        } catch (error) {
            logger.warn('Failed to parse initial search response', { query, error });
        }
    }

    const searchResult = hydrateSearchResult(client, items, continuation, estimatedResults);

    return { items, continuation, metadata, searchResult };
}

/** Search pagination: one InnerTube call → new page items + metadata. */
export async function fetchSearchContinuationPage(
    client: Client,
    continuation: string,
    existingResult?: SearchResult<'video'>,
): Promise<SearchPageFetchResult> {
    try {
        const response = await postInnertube(client, SEARCH_ENDPOINT, { continuation });
        const rawData = asYoutubeRawData(response.data);
        const metadata = extractRendererMetadata(rawData);
        const parsed = SearchResultParser.parseContinuationSearchResult(rawData, client);
        const pageItems = parsed.data as VideoCompact[];
        const nextContinuation = parsed.continuation;

        const searchResult = existingResult ?? new SearchResult<'video'>({ client });
        if (existingResult) {
            searchResult.items.push(...pageItems);
            searchResult.continuation = nextContinuation;
        } else {
            searchResult.items = pageItems;
            searchResult.continuation = nextContinuation;
        }

        return {
            items: pageItems,
            continuation: nextContinuation,
            metadata,
            searchResult,
        };
    } catch (error) {
        logger.warn('Failed to fetch or parse search continuation', { continuation, error });
        return emptySearchPage(client, existingResult);
    }
}
