import { describe, expect, it } from 'vitest';

import { extractRendererMetadata } from '@/modules/youtube/renderer-metadata';

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
});
