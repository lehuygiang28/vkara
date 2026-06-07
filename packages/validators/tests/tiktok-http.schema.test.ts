import { describe, expect, it } from 'vitest';

import { tiktokSearchBodySchema } from '../src/tiktok/http';

describe('tiktok HTTP body schemas', () => {
    it('accepts first-page search', () => {
        expect(tiktokSearchBodySchema.safeParse({ query: 'karaoke' }).success).toBe(true);
        expect(tiktokSearchBodySchema.safeParse({ query: 'karaoke', cursor: 0 }).success).toBe(
            true,
        );
    });

    it('accepts continuation search with searchId', () => {
        expect(
            tiktokSearchBodySchema.safeParse({
                query: 'karaoke',
                cursor: 12,
                searchId: '20260607200240C1C415AF6116FE8E8759',
            }).success,
        ).toBe(true);
    });

    it('rejects continuation without searchId', () => {
        expect(tiktokSearchBodySchema.safeParse({ query: 'karaoke', cursor: 12 }).success).toBe(
            false,
        );
    });
});
