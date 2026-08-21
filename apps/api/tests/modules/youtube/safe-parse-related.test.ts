import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'youtubei';

const { parseRelated, captureUnexpected } = vi.hoisted(() => ({
    parseRelated: vi.fn(),
    captureUnexpected: vi.fn(),
}));

vi.mock('youtubei', async (importOriginal) => {
    const actual = await importOriginal<typeof import('youtubei')>();
    return {
        ...actual,
        BaseVideoParser: {
            ...actual.BaseVideoParser,
            parseRelated,
        },
    };
});

vi.mock('@/sentry', () => ({
    captureUnexpected,
}));

import { safeParseRelated } from '@/modules/youtube/safe-parse-related';

const client = {} as Client;

describe('safeParseRelated', () => {
    beforeEach(() => {
        parseRelated.mockReset();
        captureUnexpected.mockReset();
    });

    it('returns parsed items when youtubei succeeds', () => {
        const items = [{ id: 'abc' }];
        parseRelated.mockReturnValue(items);

        expect(safeParseRelated({ contents: {} }, client)).toBe(items);
        expect(captureUnexpected).not.toHaveBeenCalled();
    });

    it('returns [] and captures when parseRelated throws', () => {
        const error = new TypeError("Cannot read properties of undefined (reading '0')");
        parseRelated.mockImplementation(() => {
            throw error;
        });

        expect(safeParseRelated({ onResponseReceivedEndpoints: undefined }, client)).toEqual([]);
        expect(captureUnexpected).toHaveBeenCalledWith(error, {
            tags: { area: 'youtube', route: 'related', kind: 'parse' },
            level: 'warning',
        });
    });
});
