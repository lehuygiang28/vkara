import { describe, expect, it } from 'vitest';

import {
    buildShareableRoomUrl,
    isValidRoomId,
    resolveRoomPasswordForShare,
    ROOM_ID_LENGTH,
} from '@src/room';

describe('isValidRoomId', () => {
    it('accepts exactly four digits', () => {
        expect(isValidRoomId('1234')).toBe(true);
        expect(isValidRoomId('0000')).toBe(true);
    });

    it('rejects invalid shapes', () => {
        expect(isValidRoomId('123')).toBe(false);
        expect(isValidRoomId('12345')).toBe(false);
        expect(isValidRoomId('12ab')).toBe(false);
        expect(isValidRoomId(null)).toBe(false);
        expect(isValidRoomId('')).toBe(false);
    });

    it('uses configured room id length', () => {
        expect(ROOM_ID_LENGTH).toBe(4);
    });
});

describe('resolveRoomPasswordForShare', () => {
    it('prefers trimmed room password over fallback', () => {
        expect(resolveRoomPasswordForShare('  secret  ', 'fallback')).toBe('secret');
    });

    it('falls back when room password is empty', () => {
        expect(resolveRoomPasswordForShare('   ', 'party')).toBe('party');
        expect(resolveRoomPasswordForShare(undefined, 'party')).toBe('party');
    });

    it('returns empty string when both missing', () => {
        expect(resolveRoomPasswordForShare(undefined, undefined)).toBe('');
    });
});

describe('buildShareableRoomUrl', () => {
    it('builds room invite URL without password', () => {
        expect(
            buildShareableRoomUrl({
                baseUrl: 'https://vkara.app/vi/',
                roomId: '4821',
            }),
        ).toBe('https://vkara.app/vi?roomId=4821');
    });

    it('includes password query param when provided', () => {
        expect(
            buildShareableRoomUrl({
                baseUrl: 'https://vkara.app',
                roomId: '4821',
                password: ' party ',
            }),
        ).toBe('https://vkara.app?roomId=4821&password=party');
    });

    it('omits password param when trimmed password is empty', () => {
        expect(
            buildShareableRoomUrl({
                baseUrl: 'https://vkara.app',
                roomId: '1234',
                password: '   ',
            }),
        ).toBe('https://vkara.app?roomId=1234');
    });
});
