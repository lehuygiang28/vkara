import { describe, expect, it } from 'bun:test';

import { extractSeedVideoIdFromMixListId, parseYoutubePlaylistInput } from './youtube-playlist-url';

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
});
