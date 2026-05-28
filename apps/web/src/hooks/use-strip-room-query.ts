'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { isValidRoomId } from '@vkara/shared-utils';
import { useYouTubeStore } from '@/store/youtubeStore';

const ROOM_QUERY_KEYS = ['roomId', 'password', 'layoutMode'] as const;

function hasRoomRelatedQuery(searchParams: URLSearchParams): boolean {
    return ROOM_QUERY_KEYS.some((key) => searchParams.has(key));
}

/**
 * After a successful join from an invite link (?roomId=), remove query params so
 * bookmarks and PWA opens stay on a clean URL; session continues via localStorage.
 */
export function useStripRoomQueryFromUrl() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const room = useYouTubeStore((s) => s.room);

    const roomIdParam = searchParams.get('roomId');

    useEffect(() => {
        if (!room?.id || !hasRoomRelatedQuery(searchParams)) {
            return;
        }

        if (roomIdParam && isValidRoomId(roomIdParam) && room.id !== roomIdParam) {
            return;
        }

        router.replace(pathname);
    }, [room?.id, roomIdParam, searchParams, pathname, router]);
}
