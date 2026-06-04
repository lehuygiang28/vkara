import { pickCaptionTrack, type CaptionTrack } from '@vkara/youtube';
import { describe, expect, it } from 'vitest';

import {
    isCaptionsCapablePlayer,
    normalizeYoutubeCaptionTrack,
} from '@/lib/youtube-captions';

const SAMPLE_TRACKS: CaptionTrack[] = [
    { languageCode: 'en', displayName: 'English' },
    { languageCode: 'vi', displayName: 'Vietnamese' },
];

describe('normalizeYoutubeCaptionTrack', () => {
    it('maps iframe tracklist entries', () => {
        expect(
            normalizeYoutubeCaptionTrack({
                languageCode: 'vi',
                displayName: 'Tiếng Việt',
                kind: 'asr',
            }),
        ).toEqual({
            languageCode: 'vi',
            displayName: 'Tiếng Việt',
            kind: 'asr',
        });
    });

    it('returns null without languageCode', () => {
        expect(normalizeYoutubeCaptionTrack({ displayName: 'X' })).toBeNull();
        expect(normalizeYoutubeCaptionTrack({ languageCode: '   ' })).toBeNull();
    });

    it('falls back display name through languageName and name', () => {
        expect(
            normalizeYoutubeCaptionTrack({
                languageCode: 'vi',
                languageName: 'Vietnamese',
            }),
        ).toEqual({
            languageCode: 'vi',
            displayName: 'Vietnamese',
            kind: undefined,
        });
    });
});

describe('pickCaptionTrack', () => {
    it('prefers exact language match', () => {
        expect(pickCaptionTrack(SAMPLE_TRACKS, 'vi')?.languageCode).toBe('vi');
    });

    it('falls back to first track', () => {
        expect(pickCaptionTrack(SAMPLE_TRACKS, 'ja')?.languageCode).toBe('en');
    });
});

describe('isCaptionsCapablePlayer', () => {
    it('requires getOption and setOption', () => {
        expect(isCaptionsCapablePlayer({} as YT.Player)).toBe(false);
        expect(
            isCaptionsCapablePlayer({
                getOption: () => [],
                setOption: () => undefined,
            } as unknown as YT.Player),
        ).toBe(true);
    });
});
