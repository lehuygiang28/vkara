import { useActionFeedbackStore, type ActionFeedbackVariant } from '@/store/action-feedback-store';

import { isVideoInRoom, type RoomQueueSlice } from '@/lib/room-queue';

type PendingQueueAdd = {
    videoIds: readonly string[];
    title: string;
    description?: string;
    variant: ActionFeedbackVariant;
    duration: number;
};

let pending: PendingQueueAdd | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

const PENDING_TTL_MS = 4500;

function clearPendingTimer() {
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
}

export function registerPendingQueueAdd(input: PendingQueueAdd) {
    clearPendingTimer();
    pending = input;
    pendingTimer = setTimeout(() => {
        pending = null;
        pendingTimer = null;
    }, PENDING_TTL_MS);
}

export function confirmPendingQueueAdd(prevRoom: RoomQueueSlice, nextRoom: RoomQueueSlice) {
    if (!pending) return;

    const entry = pending;
    const accepted = entry.videoIds.some(
        (videoId) => !isVideoInRoom(prevRoom, videoId) && isVideoInRoom(nextRoom, videoId),
    );

    if (accepted) {
        pending = null;
        clearPendingTimer();
        useActionFeedbackStore.getState().show({
            title: entry.title,
            description: entry.description,
            variant: entry.variant,
            duration: entry.duration,
        });
    }
}

export function cancelPendingQueueAdd(options?: { dismissVisible?: boolean }) {
    pending = null;
    clearPendingTimer();
    if (options?.dismissVisible) {
        useActionFeedbackStore.getState().dismiss();
    }
}
