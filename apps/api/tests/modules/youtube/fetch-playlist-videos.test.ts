import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPlaylist, postInnertube } = vi.hoisted(() => ({
    getPlaylist: vi.fn(),
    postInnertube: vi.fn(),
}));

vi.mock('@/modules/youtube/youtubei-client', () => ({
    getYoutubeiClient: () => ({ getPlaylist }),
}));

vi.mock('@/modules/youtube/innertube-post', () => ({
    postInnertube,
}));

import { fetchYoutubePlaylistVideos } from '@/modules/youtube/fetch-playlist-videos';

const LIST_ID = 'PLRH1bes7ddmWZCJsf02s3WLhtMV2dXbWO';

function lockupBrowsePayload(videoId: string, title: string) {
    return {
        contents: {
            twoColumnBrowseResultsRenderer: {
                tabs: [
                    {
                        tabRenderer: {
                            content: {
                                sectionListRenderer: {
                                    contents: [
                                        {
                                            itemSectionRenderer: {
                                                contents: [
                                                    {
                                                        lockupViewModel: {
                                                            contentId: videoId,
                                                            contentType:
                                                                'LOCKUP_CONTENT_TYPE_VIDEO',
                                                            metadata: {
                                                                lockupMetadataViewModel: {
                                                                    title: { content: title },
                                                                    image: {
                                                                        decoratedAvatarViewModel: {
                                                                            rendererContext: {
                                                                                commandContext: {
                                                                                    onTap: {
                                                                                        innertubeCommand:
                                                                                            {
                                                                                                browseEndpoint:
                                                                                                    {
                                                                                                        browseId:
                                                                                                            'UCchannel',
                                                                                                    },
                                                                                            },
                                                                                    },
                                                                                },
                                                                            },
                                                                            avatar: {
                                                                                avatarViewModel: {
                                                                                    image: {
                                                                                        sources: [
                                                                                            {
                                                                                                url: 'https://yt3.ggpht.com/avatar',
                                                                                                width: 48,
                                                                                                height: 48,
                                                                                            },
                                                                                        ],
                                                                                    },
                                                                                },
                                                                            },
                                                                        },
                                                                    },
                                                                    metadata: {
                                                                        contentMetadataViewModel: {
                                                                            metadataRows: [
                                                                                {
                                                                                    metadataParts: [
                                                                                        {
                                                                                            text: {
                                                                                                content:
                                                                                                    'Channel',
                                                                                            },
                                                                                        },
                                                                                    ],
                                                                                },
                                                                                {
                                                                                    metadataParts: [
                                                                                        {
                                                                                            text: {
                                                                                                content:
                                                                                                    '1K views',
                                                                                            },
                                                                                        },
                                                                                        {
                                                                                            text: {
                                                                                                content:
                                                                                                    '1 year ago',
                                                                                            },
                                                                                        },
                                                                                    ],
                                                                                },
                                                                            ],
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                            contentImage: {
                                                                thumbnailViewModel: {
                                                                    image: {
                                                                        sources: [
                                                                            {
                                                                                url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                                                                                width: 480,
                                                                                height: 360,
                                                                            },
                                                                        ],
                                                                    },
                                                                    overlays: [
                                                                        {
                                                                            thumbnailBottomOverlayViewModel:
                                                                                {
                                                                                    badges: [
                                                                                        {
                                                                                            thumbnailBadgeViewModel:
                                                                                                {
                                                                                                    text: '3:21',
                                                                                                },
                                                                                        },
                                                                                    ],
                                                                                },
                                                                        },
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        },
    };
}

describe('fetchYoutubePlaylistVideos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('falls back to lockup browse when youtubei returns playlist metadata without videos', async () => {
        getPlaylist.mockResolvedValue({
            id: LIST_ID,
            title: 'Tự hào Việt Nam',
            videoCount: 32,
            videos: { items: [], continuation: undefined },
        });
        postInnertube.mockResolvedValue({
            data: lockupBrowsePayload('HX3UcwUYMjM', 'Made In Vietnam'),
        });

        const videos = await fetchYoutubePlaylistVideos(LIST_ID, { limit: 25, fetchAll: false });

        expect(videos).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'HX3UcwUYMjM',
                    title: 'Made In Vietnam',
                }),
            ]),
        );
        expect(postInnertube).toHaveBeenCalledWith(
            expect.anything(),
            '/youtubei/v1/browse',
            expect.objectContaining({ browseId: `VL${LIST_ID}` }),
        );
    });

    it('keeps youtubei playlistVideoRenderer results without a browse fallback', async () => {
        getPlaylist.mockResolvedValue({
            id: LIST_ID,
            videos: {
                items: [
                    {
                        id: 'legacyVideo1',
                        title: 'Legacy row',
                        duration: 180,
                        thumbnails: [{ url: 'https://i.ytimg.com/vi/legacyVideo1/hqdefault.jpg' }],
                        channel: { name: 'Channel' },
                    },
                ],
                continuation: undefined,
            },
        });

        const videos = await fetchYoutubePlaylistVideos(LIST_ID, { limit: 10, fetchAll: false });

        expect(videos[0]).toEqual(
            expect.objectContaining({ id: 'legacyVideo1', title: 'Legacy row' }),
        );
        expect(postInnertube).not.toHaveBeenCalled();
    });
});
