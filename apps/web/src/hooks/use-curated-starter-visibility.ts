'use client';

import { hasBrowseFeedSources } from '@vkara/shared-utils';

import { useCuratedStore } from '@/store/curatedStore';

type BrowseFeedProfile = Parameters<typeof hasBrowseFeedSources>[0];
type BrowseFeedRoom = Parameters<typeof hasBrowseFeedSources>[1];

export function useShowCuratedStarters(profile: BrowseFeedProfile, room: BrowseFeedRoom) {
    const curatedDismissed = useCuratedStore((state) => state.curatedDismissed);
    const curatedPreviewOpen = useCuratedStore((state) => state.curatedPreviewOpen);

    if (curatedDismissed) {
        return false;
    }

    return curatedPreviewOpen || !hasBrowseFeedSources(profile, room);
}
