'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    buildBrowseFeedRankContext,
    buildBrowseFeedSessionKey,
    buildBrowseFeedSources,
    rankBrowseFeedBatch,
    type BrowseFeedSource,
    type BrowseRoomContext,
    type PersonalizationProfile,
} from '@vkara/personalization';

import type { YouTubeVideo } from '@vkara/youtube';
import { getRelatedVideos, searchYoutube } from '@/services/youtube-api';

type SourceCursor = {
    source: BrowseFeedSource;
    /** undefined = first page; null = exhausted */
    nextToken: string | null | undefined;
};

const fetchSourcePage = async (
    source: BrowseFeedSource,
    continuation: string | null | undefined,
    signal: AbortSignal,
): Promise<{ items: YouTubeVideo[]; continuation: string | null }> => {
    const token = continuation ?? null;

    if (source.kind === 'related') {
        return getRelatedVideos(source.videoId, token);
    }

    return searchYoutube({
        query: source.query,
        isKaraoke: source.isKaraoke,
        continuation: token,
        signal,
    });
};

export function useBrowseFeed(profile: PersonalizationProfile, room: BrowseRoomContext) {
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const feedKey = useMemo(() => buildBrowseFeedSessionKey(profile), [profile]);

    const profileRef = useRef(profile);
    const roomRef = useRef(room);
    profileRef.current = profile;
    roomRef.current = room;

    const cursorsRef = useRef<SourceCursor[]>([]);
    const cursorIndexRef = useRef(0);
    const seenIdsRef = useRef(new Set<string>());
    const relatedSeedsRef = useRef(new Set<string>());
    const videosRef = useRef<YouTubeVideo[]>([]);
    const generationRef = useRef(0);
    const loadingRef = useRef(false);
    const fetchFailedRef = useRef(false);

    const computeHasMore = useCallback((): boolean => {
        if (cursorsRef.current.some((cursor) => cursor.nextToken !== null)) {
            return true;
        }

        const lastVideo = videosRef.current.at(-1);
        if (lastVideo?.id && !relatedSeedsRef.current.has(lastVideo.id)) {
            return true;
        }

        return false;
    }, []);

    const resetPager = useCallback((sources: BrowseFeedSource[]) => {
        cursorsRef.current = sources.map((source) => ({
            source,
            nextToken: undefined,
        }));
        cursorIndexRef.current = 0;
        seenIdsRef.current = new Set();
        relatedSeedsRef.current = new Set(
            sources
                .filter(
                    (source): source is Extract<BrowseFeedSource, { kind: 'related' }> =>
                        source.kind === 'related',
                )
                .map((source) => source.videoId),
        );
        videosRef.current = [];
    }, []);

    const tryExtendWithRelatedChain = useCallback((): boolean => {
        const lastVideo = videosRef.current.at(-1);
        if (!lastVideo?.id || relatedSeedsRef.current.has(lastVideo.id)) {
            return false;
        }

        relatedSeedsRef.current.add(lastVideo.id);
        cursorsRef.current.push({
            source: { kind: 'related', videoId: lastVideo.id, seedTitle: lastVideo.title },
            nextToken: undefined,
        });
        return true;
    }, []);

    const fetchNextBatch = useCallback(
        async (generation: number, signal: AbortSignal): Promise<YouTubeVideo[]> => {
            const currentProfile = profileRef.current;
            const rankContext = buildBrowseFeedRankContext(currentProfile, roomRef.current);
            const maxAttempts = Math.max(cursorsRef.current.length * 3, 6);

            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                if (generation !== generationRef.current || signal.aborted) {
                    return [];
                }

                if (cursorIndexRef.current >= cursorsRef.current.length) {
                    if (!tryExtendWithRelatedChain()) {
                        return [];
                    }
                }

                const cursor = cursorsRef.current[cursorIndexRef.current];
                if (cursor.nextToken === null) {
                    cursorIndexRef.current += 1;
                    continue;
                }

                let items: YouTubeVideo[] = [];
                let continuation: string | null = null;

                try {
                    ({ items, continuation } = await fetchSourcePage(
                        cursor.source,
                        cursor.nextToken,
                        signal,
                    ));
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        return [];
                    }
                    console.warn('Browse feed source failed:', cursor.source, error);
                    fetchFailedRef.current = true;
                    return [];
                }

                if (generation !== generationRef.current || signal.aborted) {
                    return [];
                }

                cursor.nextToken = continuation;

                const ranked = rankBrowseFeedBatch(
                    items,
                    seenIdsRef.current,
                    currentProfile,
                    rankContext,
                );

                if (ranked.length === 0) {
                    if (continuation) {
                        continue;
                    }
                    cursor.nextToken = null;
                    cursorIndexRef.current += 1;
                    continue;
                }

                for (const video of ranked) {
                    seenIdsRef.current.add(video.id);
                }

                if (!continuation) {
                    cursor.nextToken = null;
                    cursorIndexRef.current += 1;
                }

                return ranked;
            }

            return [];
        },
        [tryExtendWithRelatedChain],
    );

    const runLoad = useCallback(
        async (initial: boolean, options?: { replaceExisting?: boolean }) => {
            if (loadingRef.current || cursorsRef.current.length === 0) {
                return;
            }

            const replaceExisting = options?.replaceExisting ?? false;

            loadingRef.current = true;
            setIsLoading(initial);
            setIsLoadingMore(!initial);
            if (initial) {
                setLoadError(false);
            }
            fetchFailedRef.current = false;

            const generation = generationRef.current;
            const controller = new AbortController();

            try {
                let batch = await fetchNextBatch(generation, controller.signal);
                let attempts = 0;

                while (
                    initial &&
                    batch.length === 0 &&
                    attempts < 8 &&
                    generation === generationRef.current &&
                    !controller.signal.aborted
                ) {
                    if (!computeHasMore()) {
                        break;
                    }
                    batch = await fetchNextBatch(generation, controller.signal);
                    attempts += 1;
                }

                if (generation !== generationRef.current || controller.signal.aborted) {
                    return;
                }

                if (batch.length > 0) {
                    videosRef.current = replaceExisting
                        ? batch
                        : [...videosRef.current, ...batch];
                    setVideos(videosRef.current);
                    setLoadError(false);
                    setHasMore(computeHasMore());
                } else if (fetchFailedRef.current) {
                    setLoadError(true);
                    setHasMore(true);
                } else {
                    setLoadError(false);
                    setHasMore(computeHasMore());
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error('Browse feed error:', error);
                setLoadError(true);
                setHasMore(true);
            } finally {
                loadingRef.current = false;
                if (generation === generationRef.current) {
                    setIsLoading(false);
                    setIsLoadingMore(false);
                }
            }
        },
        [computeHasMore, fetchNextBatch],
    );

    useEffect(() => {
        const sources = buildBrowseFeedSources(profileRef.current, roomRef.current);
        generationRef.current += 1;
        const generation = generationRef.current;

        setVideos([]);
        setHasMore(false);
        setLoadError(false);
        loadingRef.current = false;

        if (sources.length === 0) {
            setIsLoading(false);
            setIsLoadingMore(false);
            return;
        }

        resetPager(sources);
        setHasMore(true);
        void runLoad(true);

        return () => {
            if (generation === generationRef.current) {
                generationRef.current += 1;
            }
        };
    }, [feedKey, resetPager, runLoad]);

    const loadMore = useCallback(() => {
        if (!loadingRef.current && (hasMore || loadError)) {
            void runLoad(false);
        }
    }, [hasMore, loadError, runLoad]);

    const refresh = useCallback(async () => {
        const sources = buildBrowseFeedSources(profileRef.current, roomRef.current);
        if (sources.length === 0 || loadingRef.current) {
            return;
        }

        generationRef.current += 1;
        resetPager(sources);
        setLoadError(false);
        setHasMore(true);
        await runLoad(true, { replaceExisting: true });
    }, [resetPager, runLoad]);

    return {
        videos,
        isLoading,
        isLoadingMore,
        hasMore: hasMore || loadError,
        loadError,
        loadMore,
        refresh,
    };
}
