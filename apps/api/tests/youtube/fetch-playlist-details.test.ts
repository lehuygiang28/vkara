import { describe, expect, it, vi, beforeEach } from 'vitest';

const { fetchYoutubePlaylistVideos, getPlaylist } = vi.hoisted(() => ({
    fetchYoutubePlaylistVideos: vi.fn(),
    getPlaylist: vi.fn(),
}));

vi.mock('@/modules/youtube/fetch-playlist-videos', () => ({
    fetchYoutubePlaylistVideos,
}));

vi.mock('@/modules/youtube/youtubei-client', () => ({
    getYoutubeiClient: () => ({
        getPlaylist,
    }),
}));

import { fetchYoutubePlaylistDetails } from '@/modules/youtube/fetch-playlist-details';

describe('fetchYoutubePlaylistDetails', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns playlist metadata and videos for standard playlists', async () => {
        fetchYoutubePlaylistVideos.mockResolvedValue([
            {
                id: 'vid1',
                title: 'Song A',
                duration: 200,
                duration_formatted: '3:20',
                type: 'video',
                url: 'https://www.youtube.com/watch?v=vid1',
                uploadedAt: '',
                views: 0,
                channels: [{ name: 'Channel', verified: false }],
                thumbnails: [{ url: 'https://example.com/vid1.jpg', width: 120, height: 90 }],
            },
        ]);

        getPlaylist.mockResolvedValue({
            id: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
            title: 'Karaoke Hits',
            videoCount: 42,
            thumbnails: [{ url: 'https://example.com/pl.jpg', width: 320, height: 180 }],
            channel: { name: 'VKara' },
            videos: { items: [] },
        });

        const result = await fetchYoutubePlaylistDetails('PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI', {
            videoLimit: 25,
        });

        expect(fetchYoutubePlaylistVideos).toHaveBeenCalledWith(
            'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
            expect.objectContaining({ limit: 25, fetchAll: false }),
        );
        expect(result.playlist.title).toBe('Karaoke Hits');
        expect(result.playlist.videoCount).toBe(42);
        expect(result.videos).toHaveLength(1);
    });

    it('falls back when standard metadata fetch fails', async () => {
        fetchYoutubePlaylistVideos.mockResolvedValue([]);
        getPlaylist.mockRejectedValue(new Error('network'));

        const result = await fetchYoutubePlaylistDetails('PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI', {
            videoLimit: 10,
        });

        expect(result.playlist.id).toBe('PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
        expect(result.videos).toEqual([]);
    });

    it('builds mix metadata from returned videos', async () => {
        fetchYoutubePlaylistVideos.mockResolvedValue([
            {
                id: 'vid9',
                title: 'Seed Song',
                duration: 100,
                duration_formatted: '1:40',
                type: 'video',
                url: 'https://www.youtube.com/watch?v=vid9',
                uploadedAt: '',
                views: 0,
                channels: [{ name: 'Artist', verified: false }],
                thumbnails: [{ url: 'https://example.com/seed.jpg', width: 120, height: 90 }],
            },
        ]);

        const result = await fetchYoutubePlaylistDetails('RDMMF8kxL8y5hHw', { videoLimit: 5 });

        expect(getPlaylist).not.toHaveBeenCalled();
        expect(result.playlist.title).toContain('Seed Song');
        expect(result.playlist.videoCount).toBe(1);
    });
});
