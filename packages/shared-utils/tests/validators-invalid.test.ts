import { describe, expect, it } from 'vitest';

import { isValidRoomId } from '@src/room';
import { isValidYoutubeVideoId } from '@src/youtube-id';
import { parseYoutubePlaylistInput } from '@src/youtube-playlist-url';

/**
 * Invalid-input matrix for client/server guards.
 * Schema validation (WS) is separate; these are domain validators.
 */
describe('isValidRoomId invalid inputs', () => {
    const invalid = [
        '',
        '   ',
        '123',
        '12345',
        '12ab',
        'abcd',
        '12 34',
        '12-34',
        '1234!',
        '１２３４',
        '<script>1234</script>',
        '1234\n5678',
        'null',
        'undefined',
        '00000',
        '1'.repeat(64),
    ];

    it.each(invalid)('rejects %j', (roomId) => {
        expect(isValidRoomId(roomId)).toBe(false);
    });
});

describe('isValidYoutubeVideoId invalid inputs', () => {
    const invalid = [
        '',
        'short',
        'toolongvideoid1',
        'dQw4w9WgXcQ!',
        'dQw4w9WgXcQ\n',
        'javascript:alert(1)',
        'UCxxxxxxxxxx',
        'PLxxxxxxxxxx',
        'RDMMF8kxL8y5h',
        '../../etc/pass',
        '<img>',
        'null',
        0 as never,
        {} as never,
    ];

    it.each(invalid)('rejects %j', (id) => {
        expect(isValidYoutubeVideoId(id)).toBe(false);
    });
});

describe('parseYoutubePlaylistInput invalid inputs', () => {
    it('throws on garbage strings', () => {
        const garbage = [
            '',
            '   ',
            'not-a-playlist',
            'javascript:alert(1)',
            'https://evil.example/steal',
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ];

        for (const input of garbage) {
            expect(() => parseYoutubePlaylistInput(input)).toThrow();
        }
    });

    it('throws when no playlist id pattern matches', () => {
        expect(() => parseYoutubePlaylistInput('ZZ' + 'A'.repeat(500))).toThrow('Invalid playlist ID');
    });
});
