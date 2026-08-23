import { describe, expect, it } from 'vitest';
import type { Client } from 'youtubei';

import {
    parsePlaylistBrowseContinuation,
    parsePlaylistBrowseVideos,
} from '@/modules/youtube/parse-playlist-browse';

const client = {} as Client;

function lockupVideo(contentId: string, title: string, durationText = '3:21') {
    return {
        contentId,
        contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
        metadata: {
            lockupMetadataViewModel: {
                title: { content: title },
                image: {
                    decoratedAvatarViewModel: {
                        rendererContext: {
                            commandContext: {
                                onTap: {
                                    innertubeCommand: {
                                        browseEndpoint: { browseId: 'UCchannel' },
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
                            { metadataParts: [{ text: { content: 'Channel' } }] },
                            {
                                metadataParts: [
                                    { text: { content: '1.2K views' } },
                                    { text: { content: '1 year ago' } },
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
                            url: `https://i.ytimg.com/vi/${contentId}/hqdefault.jpg`,
                            width: 480,
                            height: 360,
                        },
                    ],
                },
                overlays: [
                    {
                        thumbnailBottomOverlayViewModel: {
                            badges: [{ thumbnailBadgeViewModel: { text: durationText } }],
                        },
                    },
                ],
            },
        },
    };
}

function browseWithLockups(lockups: ReturnType<typeof lockupVideo>[], continuation?: string) {
    const sectionContents: unknown[] = [
        {
            itemSectionRenderer: {
                contents: lockups.map((lockupViewModel) => ({ lockupViewModel })),
            },
        },
    ];

    if (continuation) {
        sectionContents.push({
            continuationItemRenderer: {
                continuationEndpoint: {
                    continuationCommand: { token: continuation },
                },
            },
        });
    }

    return {
        contents: {
            twoColumnBrowseResultsRenderer: {
                tabs: [
                    {
                        tabRenderer: {
                            content: {
                                sectionListRenderer: {
                                    contents: sectionContents,
                                },
                            },
                        },
                    },
                ],
            },
        },
    };
}

describe('parsePlaylistBrowseVideos', () => {
    it('loads lockupViewModel playlist rows that youtubei PlaylistParser skips', () => {
        const videos = parsePlaylistBrowseVideos(
            browseWithLockups([
                lockupVideo('HX3UcwUYMjM', 'Made In Vietnam'),
                lockupVideo('aaaaaaaaaaa', 'Second song', '4:02'),
            ]),
            client,
        );

        expect(videos.map((video) => ({ id: video.id, title: video.title }))).toEqual([
            { id: 'HX3UcwUYMjM', title: 'Made In Vietnam' },
            { id: 'aaaaaaaaaaa', title: 'Second song' },
        ]);
        expect(videos[0]?.duration).toBe(201);
        expect(videos[0]?.channel?.name).toBe('Channel');
    });

    it('ignores non-video lockups and empty payloads', () => {
        expect(parsePlaylistBrowseVideos({}, client)).toEqual([]);
        expect(
            parsePlaylistBrowseVideos(
                browseWithLockups([
                    {
                        ...lockupVideo('playlistid11', 'A playlist'),
                        contentType: 'LOCKUP_CONTENT_TYPE_PLAYLIST',
                    },
                ]),
                client,
            ),
        ).toEqual([]);
    });
});

describe('parsePlaylistBrowseContinuation', () => {
    it('reads continuation from a sibling sectionList item', () => {
        expect(
            parsePlaylistBrowseContinuation(
                browseWithLockups([lockupVideo('HX3UcwUYMjM', 'Made In Vietnam')], 'next-page'),
            ),
        ).toBe('next-page');
    });

    it('reads continuation from appendContinuationItemsAction', () => {
        expect(
            parsePlaylistBrowseContinuation({
                onResponseReceivedActions: [
                    {
                        appendContinuationItemsAction: {
                            continuationItems: [
                                { lockupViewModel: lockupVideo('vid22222222', 'More') },
                                {
                                    continuationItemRenderer: {
                                        continuationEndpoint: {
                                            continuationCommand: { token: 'page-3' },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            }),
        ).toBe('page-3');
    });
});
