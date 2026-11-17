import type { YouTubeVideo } from '@vkara/youtube';

import type { Room } from './websocket';

type AutoPlayRoom = Pick<Room, 'autoPlayNext' | 'videoQueue' | 'playingNow' | 'autoPlayCandidate'>;

export function pendingAutoPlayCandidate(
    room: AutoPlayRoom | null | undefined,
): YouTubeVideo | null {
    const slot = room?.autoPlayCandidate;
    if (
        !room?.autoPlayNext ||
        room.videoQueue.length > 0 ||
        !room.playingNow ||
        !slot ||
        slot.forVideoId !== room.playingNow.id
    ) {
        return null;
    }
    return slot.video;
}

export function reconcileAutoPlay(room: AutoPlayRoom): void {
    if (pendingAutoPlayCandidate(room)) {
        return;
    }
    room.autoPlayCandidate = null;
}

export function acceptAutoPlayCandidate(
    room: AutoPlayRoom,
    video: YouTubeVideo,
    forVideoId: string,
): boolean {
    if (
        !room.autoPlayNext ||
        room.videoQueue.length > 0 ||
        room.playingNow?.id !== forVideoId ||
        video.id === forVideoId ||
        video.isLive === true ||
        video.source === 'tiktok'
    ) {
        return false;
    }
    room.autoPlayCandidate = { video, forVideoId };
    return true;
}

export function autoPlayVideoToPromote(
    room: AutoPlayRoom,
    finishedVideoId: string | null,
): YouTubeVideo | null {
    const slot = room.autoPlayCandidate;
    if (
        !room.autoPlayNext ||
        room.videoQueue.length > 0 ||
        !slot ||
        !finishedVideoId ||
        slot.forVideoId !== finishedVideoId ||
        slot.video.id === finishedVideoId
    ) {
        return null;
    }
    return slot.video;
}
