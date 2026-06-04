import { describe, expect, it } from 'vitest';

import {
    youtubeCheckEmbeddableBodySchema,
    youtubePlaylistDetailsBodySchema,
    youtubeRelatedBodySchema,
    youtubeSearchBodySchema,
    youtubeSearchSuggestionsBodySchema,
} from '../src/youtube/http';

describe('youtube HTTP body schemas', () => {
    it('accepts search and related bodies', () => {
        expect(youtubeSearchBodySchema.safeParse({ query: 'karaoke' }).success).toBe(true);
        expect(
            youtubeSearchBodySchema.safeParse({ query: 'x', continuation: 'token' }).success,
        ).toBe(true);
        expect(youtubeRelatedBodySchema.safeParse({ videoId: 'dQw4w9WgXcQ' }).success).toBe(true);
    });

    it('accepts playlist body with optional limits', () => {
        expect(
            youtubePlaylistDetailsBodySchema.safeParse({ playlistUrlOrId: 'PLabc' }).success,
        ).toBe(true);
        expect(
            youtubePlaylistDetailsBodySchema.safeParse({
                playlistUrlOrId: 'PLabc',
                videoLimit: 10,
                fetchAll: false,
            }).success,
        ).toBe(true);
    });

    it('rejects missing required fields', () => {
        expect(youtubeSearchBodySchema.safeParse({}).success).toBe(false);
        expect(youtubeSearchSuggestionsBodySchema.safeParse({}).success).toBe(false);
        expect(youtubeRelatedBodySchema.safeParse({}).success).toBe(false);
        expect(youtubeCheckEmbeddableBodySchema.safeParse({}).success).toBe(false);
    });

    it('rejects wrong types', () => {
        expect(youtubeSearchBodySchema.safeParse({ query: 1 }).success).toBe(false);
        expect(youtubeCheckEmbeddableBodySchema.safeParse({ videoIds: 'x' }).success).toBe(false);
        expect(
            youtubePlaylistDetailsBodySchema.safeParse({ playlistUrlOrId: 'x', videoLimit: '10' })
                .success,
        ).toBe(false);
    });
});
