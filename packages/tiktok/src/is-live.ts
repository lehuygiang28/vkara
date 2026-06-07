import type { TikTokSearchItem } from './types';

/** TikTok webcast room status: 2 = actively broadcasting. */
const LIVE_ROOM_STATUS_ACTIVE = 2;

function hasActiveAuthorRoom(roomId: unknown): boolean {
    return (
        roomId !== undefined && roomId !== null && roomId !== '' && roomId !== '0' && roomId !== 0
    );
}

/** Detect whether a general-search item is an active livestream (not a photo post). */
export function isTikTokItemLive(item: TikTokSearchItem): boolean {
    if (item.imagePost) {
        return false;
    }

    const liveRoom = item.liveRoomInfo;
    if (liveRoom) {
        const roomId = liveRoom.roomId ?? liveRoom.roomID;
        const status = liveRoom.status;

        if (status === LIVE_ROOM_STATUS_ACTIVE) {
            return true;
        }

        if (hasActiveAuthorRoom(roomId) && status !== 4) {
            return true;
        }
    }

    // awemeType 101 is used for live / live-replay cards in some TikTok builds.
    if (item.awemeType === 101) {
        return true;
    }

    if (hasActiveAuthorRoom(item.author?.roomId)) {
        return true;
    }

    return false;
}

export function buildTikTokItemUrl(
    item: TikTokSearchItem,
    uniqueId: string,
    isLive: boolean,
): string {
    if (isLive) {
        return `https://www.tiktok.com/@${uniqueId}/live`;
    }

    return `https://www.tiktok.com/@${uniqueId}/video/${item.id}`;
}
