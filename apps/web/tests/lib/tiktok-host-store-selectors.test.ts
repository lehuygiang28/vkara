import { describe, expect, it } from 'vitest';

import {
    selectTikTokHostIsPlaying,
    selectTikTokHostPlayingNowId,
    selectTikTokPhotoSyncPlayingNowId,
    type TikTokHostRoomSlice,
} from '@/lib/tiktok-host-store-selectors';
import { createTestPersistedRoom } from '@vkara/room/test-fixtures';

const tiktokVideo = {
    id: 'tt-playing',
    title: 'Mix',
    duration: 30,
    duration_formatted: '00:30',
    type: 'video' as const,
    uploadedAt: '',
    url: 'https://www.tiktok.com/@u/video/tt-playing',
    views: 0,
    channels: [],
    thumbnails: [],
    source: 'tiktok' as const,
};

const tiktokPhoto = {
    ...tiktokVideo,
    id: 'tt-photo',
    type: 'photo' as const,
    url: 'https://www.tiktok.com/@u/photo/tt-photo',
    tiktokImageCount: 4,
};

const youtubeVideo = {
    ...tiktokVideo,
    id: 'yt-1',
    url: 'https://www.youtube.com/watch?v=yt-1',
    source: 'youtube' as const,
};

function sliceWithPlaying(
    playingNow: TikTokHostRoomSlice['room'] extends infer R
        ? R extends { playingNow?: infer V }
            ? V
            : never
        : never,
    isPlaying = true,
): TikTokHostRoomSlice {
    return {
        room: createTestPersistedRoom({
            playingNow: playingNow ?? null,
            isPlaying,
        }),
    };
}

describe('tiktok host store selectors (React #185)', () => {
    it('returns Object.is-stable primitives while a TikTok video is playing', () => {
        const state = sliceWithPlaying(tiktokVideo);

        expect(selectTikTokHostPlayingNowId(state)).toBe('tt-playing');
        expect(selectTikTokHostPlayingNowId(state)).toBe(selectTikTokHostPlayingNowId(state));
        expect(selectTikTokHostIsPlaying(state)).toBe(true);
        expect(selectTikTokHostIsPlaying(state)).toBe(selectTikTokHostIsPlaying(state));

        expect(typeof selectTikTokHostPlayingNowId(state) === 'string').toBe(true);
        expect(typeof selectTikTokHostIsPlaying(state) === 'boolean').toBe(true);
    });

    it('returns null/false for YouTube so the host guards stay idle', () => {
        const state = sliceWithPlaying(youtubeVideo);
        expect(selectTikTokHostPlayingNowId(state)).toBeNull();
        expect(selectTikTokHostIsPlaying(state)).toBe(false);
        expect(selectTikTokPhotoSyncPlayingNowId(state)).toBeNull();
    });

    it('only exposes a photo id for TikTok photo posts', () => {
        const videoState = sliceWithPlaying(tiktokVideo);
        const photoState = sliceWithPlaying(tiktokPhoto);

        expect(selectTikTokPhotoSyncPlayingNowId(videoState)).toBeNull();
        expect(selectTikTokPhotoSyncPlayingNowId(photoState)).toBe('tt-photo');
        expect(selectTikTokPhotoSyncPlayingNowId(photoState)).toBe(
            selectTikTokPhotoSyncPlayingNowId(photoState),
        );
    });

    it('does not treat a missing room as playing', () => {
        const state: TikTokHostRoomSlice = { room: null };
        expect(selectTikTokHostPlayingNowId(state)).toBeNull();
        expect(selectTikTokHostIsPlaying(state)).toBe(false);
        expect(selectTikTokPhotoSyncPlayingNowId(state)).toBeNull();
    });
});
