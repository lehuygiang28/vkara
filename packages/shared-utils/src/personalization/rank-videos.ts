import { getRecentSearchQueries, getTopChannels, normalizeChannelKey } from './profile';
import type { PersonalizableVideo, PersonalizationProfile, RankContext } from './types';
import { PERSONALIZATION_LIMITS } from './types';

const KARAOKE_TITLE_PATTERN = /karaoke|beat|instrumental|kara|cover/i;

const SCORE = {
    channelAffinity: 3,
    queryRelevance: 2,
    karaokeMode: 1,
    roomContext: 1,
} as const;

const tokenize = (text: string): string[] =>
    text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length >= 2);

const buildQueryTokens = (profile: PersonalizationProfile, currentQuery: string): Set<string> => {
    const tokens = new Set<string>(tokenize(currentQuery));

    for (const query of getRecentSearchQueries(profile, PERSONALIZATION_LIMITS.recentSearchBoostCount)) {
        for (const token of tokenize(query)) {
            tokens.add(token);
        }
    }

    return tokens;
};

const scoreVideo = (
    video: PersonalizableVideo,
    profile: PersonalizationProfile,
    ctx: RankContext,
    queryTokens: Set<string>,
    topChannelKeys: Set<string>,
    roomChannelKeys: Set<string>,
): number => {
    let score = 0;
    const channelKey = normalizeChannelKey(video.channels[0]?.name ?? '');

    if (channelKey && topChannelKeys.has(channelKey)) {
        score += SCORE.channelAffinity;
    }

    const titleTokens = tokenize(video.title);
    if (titleTokens.some((token) => queryTokens.has(token))) {
        score += SCORE.queryRelevance;
    }

    if (ctx.isKaraoke && KARAOKE_TITLE_PATTERN.test(video.title)) {
        score += SCORE.karaokeMode;
    }

    if (channelKey && roomChannelKeys.has(channelKey)) {
        score += SCORE.roomContext;
    }

    return score;
};

/** Stable re-rank: higher score first, preserve API order on ties. */
export const rankVideos = <T extends PersonalizableVideo>(
    videos: T[],
    profile: PersonalizationProfile,
    ctx: RankContext,
): T[] => {
    if (videos.length <= 1) {
        return videos;
    }

    const queryTokens = buildQueryTokens(profile, ctx.query);
    const topChannelKeys = new Set(
        getTopChannels(profile, PERSONALIZATION_LIMITS.topChannelCount).map(normalizeChannelKey),
    );
    const roomChannelKeys = new Set(
        (ctx.roomHistory ?? [])
            .slice(0, 3)
            .map((video) => normalizeChannelKey(video.channels[0]?.name ?? ''))
            .filter(Boolean),
    );

    return videos
        .map((video, index) => ({
            video,
            index,
            score: scoreVideo(video, profile, ctx, queryTokens, topChannelKeys, roomChannelKeys),
        }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(({ video }) => video);
};
