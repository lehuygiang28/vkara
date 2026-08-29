import { describe, expect, it } from 'vitest';

import {
    urlCommandDocumentSchema,
    urlCommandNameSchema,
    urlCommandOnceTokenSchema,
    urlCommandRoomIdSchema,
} from '../src/url-commands';

describe('urlCommandDocumentSchema', () => {
    it('accepts an empty document', () => {
        expect(urlCommandDocumentSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a valid invite', () => {
        expect(
            urlCommandDocumentSchema.safeParse({ roomId: '4821', password: 'secret' }).success,
        ).toBe(true);
    });

    it('rejects a non-4-digit roomId', () => {
        expect(urlCommandRoomIdSchema.safeParse('123').success).toBe(false);
        expect(urlCommandRoomIdSchema.safeParse('12ab').success).toBe(false);
    });

    it('rejects a short once token', () => {
        expect(urlCommandOnceTokenSchema.safeParse('abc').success).toBe(false);
        expect(urlCommandOnceTokenSchema.safeParse('abcdefgh').success).toBe(true);
    });

    it('clamps display name via trim/max', () => {
        expect(urlCommandNameSchema.safeParse('  Claude  ').success).toBe(true);
        expect(urlCommandNameSchema.parse('  Claude  ')).toBe('Claude');
        expect(urlCommandNameSchema.safeParse('x'.repeat(41)).success).toBe(false);
    });

    it('rejects unknown keys in strict schema', () => {
        expect(urlCommandDocumentSchema.safeParse({ launch: '1' }).success).toBe(false);
    });
});
