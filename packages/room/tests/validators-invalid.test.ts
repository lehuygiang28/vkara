import { describe, expect, it } from 'vitest';

import { isValidRoomId } from '../src/room';

/** Invalid-input matrix for client/server guards (domain validators, not WS zod). */
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
