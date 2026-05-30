import youtube from 'youtube-sr';

import { createContextLogger } from '@/utils/logger';

const logger = createContextLogger('SearchSuggestions');

/** Search autocomplete only — all other YouTube data uses youtubei. */
export async function fetchSearchSuggestions(query: string): Promise<string[]> {
    try {
        return await youtube.getSuggestions(query);
    } catch (error) {
        logger.error('Failed to get search suggestions', { error, query });
        return [];
    }
}
