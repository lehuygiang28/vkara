import { afterEach, describe, expect, it } from 'vitest';
import type { YouTubeVideo } from '@vkara/youtube';

import {
    cancelPendingQueueAdd,
    confirmPendingQueueAdd,
    registerPendingQueueAdd,
} from '@/lib/queue-action-feedback';
import type { RoomQueueSlice } from '@/lib/room-queue';
import { useActionFeedbackStore } from '@/store/action-feedback-store';

function queued(id: string): YouTubeVideo {
    return { id } as YouTubeVideo;
}

function room(ids: string[], playingId?: string): RoomQueueSlice {
    return {
        playingNow: playingId ? queued(playingId) : null,
        videoQueue: ids.map(queued),
    };
}

describe('confirmPendingQueueAdd', () => {
    afterEach(() => {
        cancelPendingQueueAdd({ dismissVisible: true });
    });

    it('shows the success toast when a later id in the batch enters the room', () => {
        registerPendingQueueAdd({
            videoIds: ['rejected', 'accepted'],
            title: 'Saved songs added to the queue',
            variant: 'success',
            duration: 1000,
        });

        confirmPendingQueueAdd(room([]), room(['accepted']));

        expect(useActionFeedbackStore.getState().visible).toBe(true);
        expect(useActionFeedbackStore.getState().title).toBe('Saved songs added to the queue');
    });

    it('stays quiet when none of the tracked ids enter the room', () => {
        registerPendingQueueAdd({
            videoIds: ['rejected'],
            title: 'Saved songs added to the queue',
            variant: 'success',
            duration: 1000,
        });

        confirmPendingQueueAdd(room([]), room(['other']));

        expect(useActionFeedbackStore.getState().visible).toBe(false);
    });
});
