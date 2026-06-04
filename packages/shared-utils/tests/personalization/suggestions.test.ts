import { describe, expect, test } from 'vitest';

import { blendSuggestions } from '@src/personalization/suggestions';

describe('blendSuggestions', () => {
    test('prefers local history matches before remote suggestions', () => {
        const blended = blendSuggestions(
            ['duc manh melody', 'duc manh lck'],
            ['duc manh co-stream', 'duc manh official'],
            'duc',
        );

        expect(blended[0]).toBe('duc manh melody');
        expect(blended).toContain('duc manh co-stream');
        expect(blended.length).toBe(4);
    });

    test('returns recent local queries when prefix is empty', () => {
        const blended = blendSuggestions(
            ['hoàng luân', 'đức mạnh', 'hoàng luân'],
            ['remote query'],
            '',
        );

        expect(blended).toEqual(['hoàng luân', 'đức mạnh']);
    });

    test('dedupes case-insensitive matches', () => {
        const blended = blendSuggestions(
            ['Karaoke Son Tung'],
            ['karaoke son tung', 'karaoke beat'],
            'kara',
        );

        expect(blended).toEqual(['Karaoke Son Tung', 'karaoke beat']);
    });

    test('skips blank local and remote suggestions', () => {
        expect(blendSuggestions(['   ', 'valid'], ['  ', 'valid two'], 'val')).toEqual([
            'valid',
            'valid two',
        ]);
    });

    test('returns empty when prefix matches nothing', () => {
        expect(blendSuggestions(['other song'], ['another'], 'zzz')).toEqual([]);
    });

    test('is case-insensitive for prefix matching', () => {
        expect(blendSuggestions(['KARAOKE mix'], [], 'kara')).toEqual(['KARAOKE mix']);
    });
});
