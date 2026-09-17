import { describe, expect, it } from 'vitest';

import {
    extractRendererMetadata,
    mergeRendererMetadata,
} from '@/modules/youtube/renderer-metadata';

describe('extractRendererMetadata lockup playlists', () => {
    it('parses Vietnamese view counts and ignores relative upload dates', () => {
        const metadata = extractRendererMetadata({
            lockupViewModel: {
                contentId: 'kXUjz4xQKRo',
                contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
                metadata: {
                    lockupMetadataViewModel: {
                        metadata: {
                            contentMetadataViewModel: {
                                metadataRows: [
                                    { metadataParts: [{ text: { content: 'PM Entertainment' } }] },
                                    {
                                        metadataParts: [
                                            { text: { content: '31.1M lượt xem' } },
                                            { text: { content: '2 tuần trước' } },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });

        expect(metadata.viewCountByVideoId.get('kXUjz4xQKRo')).toBe(31_100_000);
    });

    it('reads mix panel renderer view counts', () => {
        const metadata = extractRendererMetadata({
            playlistPanelVideoRenderer: {
                videoId: 'mixVideo1111',
                shortViewsText: { simpleText: '2.5M views' },
            },
        });

        expect(metadata.viewCountByVideoId.get('mixVideo1111')).toBe(2_500_000);
    });
});

describe('mergeRendererMetadata', () => {
    it('ORs verified flags and lets later pages override view counts', () => {
        const first = extractRendererMetadata({
            videoRenderer: {
                videoId: 'vid1',
                viewCountText: { simpleText: '100 views' },
            },
        });
        const second = extractRendererMetadata({
            videoRenderer: {
                videoId: 'vid1',
                viewCountText: { simpleText: '200 views' },
                ownerBadges: [{ metadataBadgeRenderer: { style: 'BADGE_STYLE_TYPE_VERIFIED' } }],
            },
        });

        const merged = mergeRendererMetadata(first, second);

        expect(merged.viewCountByVideoId.get('vid1')).toBe(200);
        expect(merged.verifiedByVideoId.get('vid1')).toBe(true);
    });
});
