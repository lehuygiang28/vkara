import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'youtubei';

const { videoLoad, liveVideoLoad, postInnertube, captureUnexpected } = vi.hoisted(() => ({
    videoLoad: vi.fn(),
    liveVideoLoad: vi.fn(),
    postInnertube: vi.fn(),
    captureUnexpected: vi.fn(),
}));

vi.mock('youtubei', () => ({
    Client: class {},
    Video: class {
        load = videoLoad;
    },
    LiveVideo: class {
        load = liveVideoLoad;
    },
}));

vi.mock('@/modules/youtube/innertube-post', () => ({
    postInnertube,
}));

vi.mock('@/sentry', () => ({
    captureUnexpected,
}));

import { loadVideoFromNextResponses } from '@/modules/youtube/load-video-from-next';

const client = {} as Client;

const nextPayload = {
    data: {
        contents: {
            twoColumnWatchNextResults: {
                results: {
                    results: {
                        contents: [{ videoPrimaryInfoRenderer: {} }],
                    },
                },
            },
        },
    },
};

const playerPayload = {
    data: {
        playabilityStatus: { status: 'OK' },
    },
};

describe('loadVideoFromNextResponses', () => {
    beforeEach(() => {
        videoLoad.mockReset();
        liveVideoLoad.mockReset();
        postInnertube.mockReset();
        captureUnexpected.mockReset();
        postInnertube.mockImplementation(async (_client: unknown, endpoint: string) =>
            endpoint.includes('/next') ? nextPayload : playerPayload,
        );
    });

    it('returns video: undefined and captures when Video.load throws', async () => {
        const error = new TypeError("Cannot read properties of undefined (reading 'content')");
        videoLoad.mockImplementation(() => {
            throw error;
        });

        const result = await loadVideoFromNextResponses(client, 'dQw4w9WgXcQ');

        expect(result.video).toBeUndefined();
        expect(result.nextResponseData).toBe(nextPayload.data);
        expect(captureUnexpected).toHaveBeenCalledWith(error, {
            tags: { area: 'youtube', route: 'related', kind: 'parse' },
            level: 'warning',
        });
    });

    it('does not call Video.load when InnerTube contents are missing', async () => {
        postInnertube.mockImplementation(async (_client: unknown, endpoint: string) =>
            endpoint.includes('/next') ? { data: {} } : playerPayload,
        );

        const result = await loadVideoFromNextResponses(client, 'abc');

        expect(result.video).toBeUndefined();
        expect(videoLoad).not.toHaveBeenCalled();
        expect(captureUnexpected).not.toHaveBeenCalled();
    });
});
