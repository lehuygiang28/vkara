'use client';

import { useEffect } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';

import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { TvRoomLobby } from '@/components/pages/youtube/TvRoomLobby';

type TvSpatialLobbyProps = {
    onOpenSettingsAction?: () => void;
};

export function TvSpatialLobby({ onOpenSettingsAction }: TvSpatialLobbyProps) {
    const { ref, focusKey, focusSelf } = useFocusable({
        focusKey: TV_FOCUS_KEYS.lobby,
        trackChildren: true,
        preferredChildFocusKey: TV_FOCUS_KEYS.lobbyCreate,
    });

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    return (
        <FocusContext.Provider value={focusKey}>
            <div ref={ref} className="w-full">
                <TvRoomLobby onOpenSettingsAction={onOpenSettingsAction} spatial />
            </div>
        </FocusContext.Provider>
    );
}
