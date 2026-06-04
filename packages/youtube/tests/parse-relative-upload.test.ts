import { describe, expect, it } from 'vitest';

import { parseYoutubeRelativeUpload } from '../src/parse-relative-upload';

describe('parseYoutubeRelativeUpload', () => {
    it('parses numeric relative labels', () => {
        expect(parseYoutubeRelativeUpload('11 months ago')).toEqual({
            kind: 'relative',
            value: 11,
            unit: 'month',
        });
        expect(parseYoutubeRelativeUpload('2 days ago')).toEqual({
            kind: 'relative',
            value: 2,
            unit: 'day',
        });
    });

    it('parses a/an as quantity 1', () => {
        expect(parseYoutubeRelativeUpload('a year ago')).toEqual({
            kind: 'relative',
            value: 1,
            unit: 'year',
        });
        expect(parseYoutubeRelativeUpload('an hour ago')).toEqual({
            kind: 'relative',
            value: 1,
            unit: 'hour',
        });
    });

    it('parses streamed/premiered prefixes and unit aliases', () => {
        expect(parseYoutubeRelativeUpload('Streamed 3 weeks ago')).toEqual({
            kind: 'relative',
            value: 3,
            unit: 'week',
        });
        expect(parseYoutubeRelativeUpload('Premiered 5 mins ago')).toEqual({
            kind: 'relative',
            value: 5,
            unit: 'minute',
        });
    });

    it('recognizes just-now labels', () => {
        expect(parseYoutubeRelativeUpload('just now')).toEqual({ kind: 'justNow' });
        expect(parseYoutubeRelativeUpload('  A moment ago  ')).toEqual({ kind: 'justNow' });
    });

    it('returns null for invalid or empty input', () => {
        expect(parseYoutubeRelativeUpload('')).toBeNull();
        expect(parseYoutubeRelativeUpload('   ')).toBeNull();
        expect(parseYoutubeRelativeUpload('yesterday')).toBeNull();
        expect(parseYoutubeRelativeUpload('11 fortnights ago')).toBeNull();
        expect(parseYoutubeRelativeUpload('0 days ago')).toEqual({
            kind: 'relative',
            value: 0,
            unit: 'day',
        });
    });
});
