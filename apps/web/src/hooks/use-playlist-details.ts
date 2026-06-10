'use client';

import { useEffect, useState } from 'react';
import type { PlaylistDetailsResponse } from '@vkara/youtube';

import { fetchPlaylistDetails } from '@/services/youtube-api';

type UsePlaylistDetailsOptions = {
    videoLimit?: number;
    fetchAll?: boolean;
};

export function usePlaylistDetails(listId: string, options?: UsePlaylistDetailsOptions) {
    const videoLimit = options?.videoLimit;
    const fetchAll = options?.fetchAll;
    const [details, setDetails] = useState<PlaylistDetailsResponse | undefined>();
    const [error, setError] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(undefined);

        void fetchPlaylistDetails(listId, { videoLimit, fetchAll })
            .then((data) => {
                if (!cancelled) {
                    setDetails(data);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load playlist');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [listId, videoLimit, fetchAll]);

    return { details, error, isLoading };
}
