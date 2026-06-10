import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
    fetchYoutubePlaylistDetails,
    readCachedPlaylistDetails,
    setCachedPlaylistDetails,
    storeFullPlaylistDetailsCache,
} = vi.hoisted(() => ({
    fetchYoutubePlaylistDetails: vi.fn(),
    readCachedPlaylistDetails: vi.fn(),
    setCachedPlaylistDetails: vi.fn(),
    storeFullPlaylistDetailsCache: vi.fn(),
}));

vi.mock('@/modules/youtube/fetch-playlist-details', () => ({
    fetchYoutubePlaylistDetails,
}));

vi.mock('@/modules/youtube/playlist-details-cache', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/modules/youtube/playlist-details-cache')>();
    return {
        ...actual,
        readCachedPlaylistDetails,
        setCachedPlaylistDetails,
        storeFullPlaylistDetailsCache,
    };
});

vi.mock('@/modules/youtube/resolve-embed-playability', () => ({
    filterVideosForListPrefilter: vi.fn(async (_redis: unknown, videos: unknown[]) => videos),
}));

import { resolvePlaylistDetails } from '@/modules/youtube/fetch-playlist-details-cached';

const redis = {} as never;

const incompleteDetails = {
    playlist: {
        id: 'PLRH1bes7ddmVp0Cpe2OWJxK6zqA2h8CrD',
        title: 'Nhạc trẻ mix linh tinh - Kara list',
        videoCount: 40,
    },
    videos: [],
};

const completeDetails = {
    playlist: {
        id: 'PLRH1bes7ddmVp0Cpe2OWJxK6zqA2h8CrD',
        title: 'Nhạc trẻ mix linh tinh - Kara list',
        videoCount: 40,
    },
    videos: [
        {
            id: 'vid1',
            title: 'Song',
            duration: 200,
            duration_formatted: '3:20',
            type: 'video',
            uploadedAt: '2020-01-01',
            url: 'https://www.youtube.com/watch?v=vid1',
            views: 100,
            channels: [{ name: 'Artist', verified: true }],
            thumbnails: [{ url: 'https://i.ytimg.com/vi/vid1/default.jpg' }],
        },
    ],
};

describe('resolvePlaylistDetails', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        readCachedPlaylistDetails.mockResolvedValue(undefined);
        setCachedPlaylistDetails.mockResolvedValue(undefined);
        storeFullPlaylistDetailsCache.mockResolvedValue(undefined);
    });

    it('ignores cached metadata-only payloads and refetches', async () => {
        readCachedPlaylistDetails.mockResolvedValueOnce(undefined);
        fetchYoutubePlaylistDetails.mockResolvedValue(completeDetails);

        await expect(
            resolvePlaylistDetails(redis, incompleteDetails.playlist.id, {
                videoLimit: 100,
            }),
        ).resolves.toEqual(completeDetails);

        expect(fetchYoutubePlaylistDetails).toHaveBeenCalledTimes(1);
        expect(setCachedPlaylistDetails).toHaveBeenCalledWith(
            redis,
            expect.stringContaining(incompleteDetails.playlist.id),
            completeDetails,
        );
    });

    it('does not write incomplete fetches to Redis', async () => {
        fetchYoutubePlaylistDetails.mockResolvedValue(incompleteDetails);

        await expect(
            resolvePlaylistDetails(redis, incompleteDetails.playlist.id, {
                videoLimit: 100,
            }),
        ).resolves.toEqual(incompleteDetails);

        expect(setCachedPlaylistDetails).not.toHaveBeenCalled();
        expect(storeFullPlaylistDetailsCache).not.toHaveBeenCalled();
    });

    it('serves complete cached payloads without refetching', async () => {
        readCachedPlaylistDetails.mockResolvedValue(completeDetails);

        await expect(
            resolvePlaylistDetails(redis, completeDetails.playlist.id, {
                videoLimit: 100,
            }),
        ).resolves.toEqual(completeDetails);

        expect(fetchYoutubePlaylistDetails).not.toHaveBeenCalled();
    });

    it('refresh mode fetches fresh and stores only the full playlist cache', async () => {
        readCachedPlaylistDetails.mockResolvedValue(completeDetails);
        fetchYoutubePlaylistDetails.mockResolvedValue(completeDetails);

        await expect(
            resolvePlaylistDetails(redis, completeDetails.playlist.id, {
                fetchAll: true,
                mode: 'refresh',
            }),
        ).resolves.toEqual(completeDetails);

        expect(readCachedPlaylistDetails).not.toHaveBeenCalled();
        expect(fetchYoutubePlaylistDetails).toHaveBeenCalledTimes(1);
        expect(storeFullPlaylistDetailsCache).toHaveBeenCalledWith(redis, completeDetails);
        expect(setCachedPlaylistDetails).not.toHaveBeenCalled();
    });
});
