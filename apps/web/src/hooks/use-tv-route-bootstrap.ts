'use client';

import { useEffect } from 'react';

import { useYouTubeStore } from '@/store/youtubeStore';

/** Force TV player-host mode for the dedicated `/tv` route. */
export function useTvRouteBootstrap(): void {
    useEffect(() => {
        const store = useYouTubeStore.getState();
        store.setLayoutMode('player', 'url');
        useYouTubeStore.setState({ tvSuppressAutoCreate: false });
    }, []);
}
