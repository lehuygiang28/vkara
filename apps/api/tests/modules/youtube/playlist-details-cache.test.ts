import { describe, expect, it, vi } from 'vitest';

import {
    getCachedPlaylistDetails,
    readCachedPlaylistDetails,
    storeFullPlaylistDetailsCache,
} from '@/modules/youtube/playlist-details-cache';

const video = {
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
};

const validPayload = {
    playlist: { id: 'PLabc', title: 'Karaoke', videoCount: 1 },
    videos: [video],
};

describe('getCachedPlaylistDetails', () => {
    it('returns validated playlist details from Redis JSON', async () => {
        const redis = {
            get: vi.fn().mockResolvedValue(JSON.stringify(validPayload)),
        } as never;

        await expect(
            getCachedPlaylistDetails(redis, 'youtube-playlist-details:PLabc:all'),
        ).resolves.toEqual(validPayload);
    });

    it('rejects cache payloads with non-object playlist or non-string playlist id', async () => {
        const redis = {
            get: vi
                .fn()
                .mockResolvedValueOnce(
                    JSON.stringify({
                        playlist: 'PLabc',
                        videos: validPayload.videos,
                    }),
                )
                .mockResolvedValueOnce(
                    JSON.stringify({
                        playlist: { id: 1, title: 'Karaoke', videoCount: 1 },
                        videos: validPayload.videos,
                    }),
                ),
        } as never;

        await expect(getCachedPlaylistDetails(redis, 'k1')).resolves.toBeUndefined();
        await expect(getCachedPlaylistDetails(redis, 'k2')).resolves.toBeUndefined();
    });

    it('rejects cache payloads when any video entry is invalid', async () => {
        const redis = {
            get: vi.fn().mockResolvedValue(
                JSON.stringify({
                    playlist: validPayload.playlist,
                    videos: [{ id: 1, title: 'Song' }],
                }),
            ),
        } as never;

        await expect(getCachedPlaylistDetails(redis, 'k')).resolves.toBeUndefined();
    });
});

describe('readCachedPlaylistDetails', () => {
    it('slices a full cached playlist for limited preview scopes', async () => {
        const fullPayload = {
            playlist: { id: 'PLabc', title: 'Karaoke', videoCount: 2 },
            videos: [
                video,
                {
                    ...video,
                    id: 'vid2',
                    url: 'https://www.youtube.com/watch?v=vid2',
                },
            ],
        };
        const redis = {
            get: vi
                .fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(JSON.stringify(fullPayload)),
        } as never;

        await expect(
            readCachedPlaylistDetails(redis, 'PLabc', { fetchAll: false, videoLimit: 1 }),
        ).resolves.toEqual({
            playlist: fullPayload.playlist,
            videos: [video],
        });
    });
});

describe('storeFullPlaylistDetailsCache', () => {
    it('writes only the canonical full playlist cache key', async () => {
        const set = vi.fn().mockResolvedValue('OK');
        const redis = { set } as never;

        await storeFullPlaylistDetailsCache(redis, validPayload);

        expect(set).toHaveBeenCalledTimes(1);
        expect(set.mock.calls[0]?.[0]).toBe('youtube-playlist-details:PLabc:all');
    });
});
