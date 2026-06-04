import { getTopChannels } from './profile';
import { rankVideos } from './rank-videos';
import type { PersonalizableVideo, PersonalizationProfile, RankContext } from './types';
import { PERSONALIZATION_LIMITS } from './types';

export type BrowseFeedSource =
    | { kind: 'related'; videoId: string; seedTitle?: string }
    | { kind: 'search'; query: string; isKaraoke: boolean };

export type BrowseRoomContext = {
    playingNow?: PersonalizableVideo | null;
    historyQueue: PersonalizableVideo[];
};

/** Room related first, then profile related/search/channel sources. */
export const buildBrowseFeedSources = (
    profile: PersonalizationProfile,
    room: BrowseRoomContext,
): BrowseFeedSource[] => {
    const sources: BrowseFeedSource[] = [];
    const seenRelated = new Set<string>();
    const seenQueries = new Set<string>();

    const pushRelated = (video: PersonalizableVideo | null | undefined) => {
        if (!video?.id || seenRelated.has(video.id)) {
            return;
        }
        seenRelated.add(video.id);
        sources.push({ kind: 'related', videoId: video.id, seedTitle: video.title });
    };

    pushRelated(room.playingNow);
    for (const video of room.historyQueue.slice(0, 3)) {
        pushRelated(video);
    }
    pushRelated(profile.recentVideos[0]);

    for (const entry of profile.searchHistory) {
        const query = entry.query.trim();
        if (!query) {
            continue;
        }

        const key = query.toLowerCase();
        if (seenQueries.has(key)) {
            continue;
        }

        seenQueries.add(key);
        sources.push({ kind: 'search', query, isKaraoke: entry.isKaraoke });
    }

    for (const channel of getTopChannels(profile, PERSONALIZATION_LIMITS.topChannelCount)) {
        const key = channel.toLowerCase();
        if (seenQueries.has(key)) {
            continue;
        }

        seenQueries.add(key);
        sources.push({ kind: 'search', query: channel, isKaraoke: false });
    }

    return sources;
};

export const hasBrowseFeedSources = (
    profile: PersonalizationProfile,
    room: BrowseRoomContext,
): boolean => buildBrowseFeedSources(profile, room).length > 0;

/**
 * Stable key for resetting the browse feed. Only search-history identity should
 * invalidate the list; room/engagement changes update ranking via refs silently.
 */
export const buildBrowseFeedSessionKey = (profile: PersonalizationProfile): string =>
    JSON.stringify({
        searches: profile.searchHistory.map((entry) => `${entry.query}:${entry.isKaraoke}`),
    });

/** Dedupe against existing ids, rank a incoming batch for feed append. */
export const rankBrowseFeedBatch = <T extends PersonalizableVideo>(
    incoming: T[],
    existingIds: ReadonlySet<string>,
    profile: PersonalizationProfile,
    ctx: RankContext,
): T[] => {
    const fresh = incoming.filter((video) => !existingIds.has(video.id));
    if (fresh.length === 0) {
        return [];
    }
    return rankVideos(fresh, profile, ctx);
};

export const buildBrowseFeedRankContext = (
    profile: PersonalizationProfile,
    room: BrowseRoomContext,
): RankContext => {
    const latestSearch = profile.searchHistory[0];

    return {
        query: latestSearch?.query ?? room.playingNow?.title ?? profile.recentVideos[0]?.title ?? '',
        isKaraoke: latestSearch?.isKaraoke ?? false,
        roomHistory: room.historyQueue,
    };
};
