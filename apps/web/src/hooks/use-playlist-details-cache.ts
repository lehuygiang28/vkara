'use client';

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { PlaylistDetailsResponse } from '@vkara/youtube';

import { fetchPlaylistDetails } from '@/services/youtube-api';

type CacheEntry = {
    data?: PlaylistDetailsResponse;
    error?: string;
    promise?: Promise<PlaylistDetailsResponse>;
};

function notifyCacheUpdate(setBump: Dispatch<SetStateAction<number>>) {
    setBump((value) => value + 1);
}

export function usePlaylistDetailsCache() {
    const cacheRef = useRef(new Map<string, CacheEntry>());
    const [, setBump] = useState(0);

    const getEntry = useCallback((listId: string) => cacheRef.current.get(listId), []);

    const prefetch = useCallback(
        (listId: string, options?: { videoLimit?: number }): Promise<PlaylistDetailsResponse> => {
            const existing = cacheRef.current.get(listId);
            if (existing?.data) {
                return Promise.resolve(existing.data);
            }
            if (existing?.promise) {
                return existing.promise;
            }

            const promise = fetchPlaylistDetails(listId, options)
                .then((data) => {
                    cacheRef.current.set(listId, { data });
                    notifyCacheUpdate(setBump);
                    return data;
                })
                .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Failed to load playlist';
                    cacheRef.current.set(listId, { error: message });
                    notifyCacheUpdate(setBump);
                    throw error;
                });

            cacheRef.current.set(listId, { promise });
            return promise;
        },
        [],
    );

    const load = useCallback(
        (listId: string, options?: { videoLimit?: number }) => {
            const entry = cacheRef.current.get(listId);
            if (entry?.data) {
                return Promise.resolve(entry.data);
            }
            if (entry?.promise) {
                return entry.promise;
            }
            return prefetch(listId, options);
        },
        [prefetch],
    );

    return { getEntry, prefetch, load };
}
