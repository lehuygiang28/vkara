import { describe, expect, it } from 'bun:test';

import { pickCaptionTrack, type CaptionTrack } from '@vkara/shared-types';

import {
    isCaptionsCapablePlayer,
    normalizeYoutubeCaptionTrack,
} from './youtube-captions';

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
            } as YT.Player),
        ).toBe(true);
    });
});
