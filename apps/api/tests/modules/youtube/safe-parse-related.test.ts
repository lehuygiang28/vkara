import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'youtubei';

const { parseRelated, parseContinuation, captureUnexpected } = vi.hoisted(() => ({
    parseRelated: vi.fn(),
    parseContinuation: vi.fn(),
    captureUnexpected: vi.fn(),
}));

vi.mock('youtubei', async (importOriginal) => {
    const actual = await importOriginal<typeof import('youtubei')>();
    return {
        ...actual,
        BaseVideoParser: {
            ...actual.BaseVideoParser,
            parseRelated,
            parseContinuation,
        },
    };
});

vi.mock('@/sentry', () => ({
    captureUnexpected,
}));

import {
    resolveRelatedShelf,
    safeParseContinuation,
    safeParseRelated,
} from '@/modules/youtube/safe-parse-related';

const client = {} as Client;

describe('safeParseRelated', () => {
    beforeEach(() => {
        parseRelated.mockReset();
        parseContinuation.mockReset();
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

describe('safeParseContinuation', () => {
    beforeEach(() => {
        parseContinuation.mockReset();
        captureUnexpected.mockReset();
    });

    it('returns the token when youtubei succeeds', () => {
        parseContinuation.mockReturnValue('next-token');

        expect(safeParseContinuation({ contents: {} })).toBe('next-token');
        expect(captureUnexpected).not.toHaveBeenCalled();
    });

    it('returns undefined and captures when parseContinuation throws', () => {
        const error = new TypeError("Cannot read properties of undefined (reading 'token')");
        parseContinuation.mockImplementation(() => {
            throw error;
        });

        expect(safeParseContinuation({ contents: {} })).toBeUndefined();
        expect(captureUnexpected).toHaveBeenCalledWith(error, {
            tags: { area: 'youtube', route: 'related', kind: 'parse' },
            level: 'warning',
        });
    });
});

describe('resolveRelatedShelf', () => {
    beforeEach(() => {
        parseRelated.mockReset();
        parseContinuation.mockReset();
        captureUnexpected.mockReset();
    });

    it('uses video.related when the loaded video has a related shell', () => {
        const items = [{ id: 'from-video' }] as never;
        const video = { related: { items, continuation: 'from-video' } };

        expect(resolveRelatedShelf(video, { contents: {} }, client)).toEqual({
            items,
            continuation: 'from-video',
        });
        expect(parseRelated).not.toHaveBeenCalled();
        expect(parseContinuation).not.toHaveBeenCalled();
    });

    it('keeps raw continuation when Video.load failed but related parse succeeds', () => {
        const items = [{ id: 'from-raw' }];
        parseRelated.mockReturnValue(items);
        parseContinuation.mockReturnValue('raw-token');

        expect(resolveRelatedShelf(undefined, { contents: {} }, client)).toEqual({
            items,
            continuation: 'raw-token',
        });
        expect(captureUnexpected).not.toHaveBeenCalled();
    });
});
