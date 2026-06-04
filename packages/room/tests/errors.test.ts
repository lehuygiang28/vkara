import { describe, expect, it } from 'vitest';

import { ErrorCode, RoomError } from '../src/errors';

describe('RoomError', () => {
    it('uses default message for known codes', () => {
        const err = new RoomError(ErrorCode.ROOM_NOT_FOUND);
        expect(err.code).toBe(ErrorCode.ROOM_NOT_FOUND);
        expect(err.message).toBe('Room not found');
        expect(err.name).toBe('RoomError');
    });

    it('allows custom message override', () => {
        const err = new RoomError(ErrorCode.INCORRECT_PASSWORD, 'Wrong party code');
        expect(err.message).toBe('Wrong party code');
    });
});
