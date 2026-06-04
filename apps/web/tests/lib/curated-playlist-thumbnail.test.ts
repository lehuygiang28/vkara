import { describe, expect, it } from 'vitest';

import { resolveCuratedPlaylistThumbnail } from '@/lib/curated-playlist-thumbnail';
import type { PlaylistDetailsResponse, YouTubeVideo } from '@vkara/youtube';

const PLAYLIST_ID = 'PLRH1bes7ddmVMYRkmPNJY4lFZsGlAAXbC';

function makeVideo(
    id: string,
    thumbnails: YouTubeVideo['thumbnails'],
): YouTubeVideo {
    return {
        id,
        title: 'First song',
        duration: 0,
        duration_formatted: '0:00',
        type: 'video',
        uploadedAt: '',
        url: `https://www.youtube.com/watch?v=${id}`,
        views: 0,
        channels: [],
        thumbnails,
    };
}

function makeDetails(overrides: Partial<PlaylistDetailsResponse> = {}): PlaylistDetailsResponse {
    return {
        playlist: {
            id: PLAYLIST_ID,
            title: 'Test playlist',
            videoCount: 2,
            thumbnails: [],
        },
        videos: [],
        ...overrides,
    };
}

describe('resolveCuratedPlaylistThumbnail', () => {
    it('returns real playlist thumbnail URL when present', () => {
        const url = 'https://i.ytimg.com/vi/abc123/mqdefault.jpg';
        const details = makeDetails({
            playlist: {
                id: PLAYLIST_ID,
                title: 'Test',
                videoCount: 1,
                thumbnails: [{ url, width: 320, height: 180 }],
            },
        });

        expect(resolveCuratedPlaylistThumbnail(details, PLAYLIST_ID)).toBe(url);
    });

    it('skips synthetic playlist-id video thumb and uses first video', () => {
        const bogus = `https://i.ytimg.com/vi/${PLAYLIST_ID}/mqdefault.jpg`;
        const videoUrl = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg';
        const details = makeDetails({
            playlist: {
                id: PLAYLIST_ID,
                title: 'Test',
                videoCount: 1,
                thumbnails: [{ url: bogus, width: 320, height: 180 }],
            },
            videos: [makeVideo('dQw4w9WgXcQ', [{ url: videoUrl, width: 320, height: 180 }])],
        });

        expect(resolveCuratedPlaylistThumbnail(details, PLAYLIST_ID)).toBe(videoUrl);
    });

    it('returns null when no details', () => {
        expect(resolveCuratedPlaylistThumbnail(undefined, PLAYLIST_ID)).toBeNull();
    });
});
