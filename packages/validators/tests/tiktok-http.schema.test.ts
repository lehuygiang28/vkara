import { describe, expect, it } from 'vitest';

import { tiktokSearchBodySchema } from '../src/tiktok/http';

const DEVICE_ID = 'dda73f64-1234-4abc-8def-123456789abc';
const SEARCH_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('tiktok HTTP body schemas', () => {
    it('accepts first-page search with deviceId', () => {
        expect(
            tiktokSearchBodySchema.safeParse({ query: 'karaoke', deviceId: DEVICE_ID }).success,
        ).toBe(true);
        expect(
            tiktokSearchBodySchema.safeParse({
                query: 'karaoke',
                deviceId: DEVICE_ID,
                cursor: 0,
            }).success,
        ).toBe(true);
    });

    it('rejects first-page search without deviceId', () => {
        expect(tiktokSearchBodySchema.safeParse({ query: 'karaoke' }).success).toBe(false);
    });

    it('accepts continuation search with searchId', () => {
        expect(
            tiktokSearchBodySchema.safeParse({
                query: 'karaoke',
                deviceId: DEVICE_ID,
                cursor: 12,
                searchId: SEARCH_ID,
            }).success,
        ).toBe(true);
    });

    it('rejects continuation without searchId', () => {
        expect(
            tiktokSearchBodySchema.safeParse({
                query: 'karaoke',
                deviceId: DEVICE_ID,
                cursor: 12,
            }).success,
        ).toBe(false);
    });
});
