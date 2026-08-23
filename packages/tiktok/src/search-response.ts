import type { SearchResponse } from './types';

export function isInitialSearchApiUrl(url: string, keyword: string): boolean {
    if (!url.includes('/api/search/general/full')) {
        return false;
    }

    const params = new URL(url).searchParams;
    if (params.get('keyword') !== keyword) {
        return false;
    }

    return Number(params.get('cursor') ?? '0') === 0;
}

export function isUsableSearchResponse(json: SearchResponse): boolean {
    const hasItems = (json.data?.length ?? 0) > 0;
    return json.status_code === 0 || (json.status_code === 203 && hasItems);
}
