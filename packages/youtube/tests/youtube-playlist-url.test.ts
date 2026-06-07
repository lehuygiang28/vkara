import { describe, expect, it } from 'vitest';

import {
    extractSeedVideoIdFromMixListId,
    parseYoutubePlaylistInput,
} from '../src/youtube-playlist-url';

describe('parseYoutubePlaylistInput', () => {
    it('normalizes mix watch URLs without start_radio or playnext', () => {
        const parsed = parseYoutubePlaylistInput(
            'https://www.youtube.com/watch?v=F8kxL8y5hHw&list=RDMMF8kxL8y5hHw&start_radio=1',
        );

        expect(parsed.isMix).toBe(true);
        expect(parsed.listId).toBe('RDMMF8kxL8y5hHw');
        expect(parsed.fetchUrl).toBe(
            'https://www.youtube.com/watch?v=F8kxL8y5hHw&list=RDMMF8kxL8y5hHw',
        );
    });

    it('builds mix watch URL from bare RDMM list id', () => {
        const parsed = parseYoutubePlaylistInput('RDMMF8kxL8y5hHw');

        expect(parsed.fetchUrl).toBe(
            'https://www.youtube.com/watch?v=F8kxL8y5hHw&list=RDMMF8kxL8y5hHw',
        );
    });

    it('uses playlist URL for standard PL lists', () => {
        const parsed = parseYoutubePlaylistInput('PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');

        expect(parsed.isMix).toBe(false);
        expect(parsed.fetchUrl).toContain('/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
        expect(parsed.fetchUrl).toContain('playnext=1');
    });
});

describe('extractSeedVideoIdFromMixListId', () => {
    it('extracts video id from RDMM list id', () => {
        expect(extractSeedVideoIdFromMixListId('RDMMF8kxL8y5hHw')).toBe('F8kxL8y5hHw');
    });

    it('returns null for invalid or short list ids', () => {
        expect(extractSeedVideoIdFromMixListId('RDMMshort')).toBeNull();
        expect(extractSeedVideoIdFromMixListId('PLnotamixlist')).toBeNull();
        expect(extractSeedVideoIdFromMixListId('')).toBeNull();
    });
});

describe('parseYoutubePlaylistInput errors', () => {
    it('throws when input is empty', () => {
        expect(() => parseYoutubePlaylistInput('')).toThrow('Playlist URL or ID is required');
        expect(() => parseYoutubePlaylistInput('   ')).toThrow('Playlist URL or ID is required');
    });

    it('throws for bare invalid ids', () => {
        expect(() => parseYoutubePlaylistInput('not-a-playlist')).toThrow('Invalid playlist ID');
    });

    it('throws for URLs without list id', () => {
        expect(() =>
            parseYoutubePlaylistInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        ).toThrow('Invalid playlist URL');
    });
});
