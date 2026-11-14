import { describe, expect, it } from 'vitest';

import { readPlaybackPositionSeconds } from '@/lib/active-playback';

const video = { source: 'youtube' as const, url: 'https://www.youtube.com/watch?v=vid' };

describe('readPlaybackPositionSeconds', () => {
    it('floors the time reported by a usable player', () => {
        const youtubePlayer = {
            getCurrentTime: () => 4.8,
        } as unknown as YT.Player;

        expect(
            readPlaybackPositionSeconds({
                video,
                youtubePlayer,
                roomIsPlaying: false,
                roomCurrentTime: 1,
            }),
        ).toBe(4);
    });

    it('uses the room time when the player iframe is gone', () => {
        const youtubePlayer = {
            getIframe() {
                throw new Error('detached');
            },
            getCurrentTime() {
                throw new Error('detached');
            },
        } as unknown as YT.Player;

        expect(
            readPlaybackPositionSeconds({
                video,
                youtubePlayer,
                roomIsPlaying: true,
                roomCurrentTime: 12,
            }),
        ).toBe(12);
    });
});
