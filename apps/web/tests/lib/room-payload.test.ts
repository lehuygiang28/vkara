import { describe, expect, it } from 'vitest';

import { encodeRoomQrPayload, parseRoomFromScan } from '@/lib/room-payload';

describe('parseRoomFromScan', () => {
    it('returns null for empty or whitespace input', () => {
        expect(parseRoomFromScan('')).toBeNull();
        expect(parseRoomFromScan('   ')).toBeNull();
    });

    it('parses bare four-digit room codes', () => {
        expect(parseRoomFromScan('4821')).toEqual({ roomId: '4821' });
        expect(parseRoomFromScan('  1234  ')).toEqual({ roomId: '1234' });
    });

    it('rejects invalid bare codes', () => {
        expect(parseRoomFromScan('123')).toBeNull();
        expect(parseRoomFromScan('abcd')).toBeNull();
    });

    it('parses HTTPS invite URLs', () => {
        expect(parseRoomFromScan('https://vkara.app/vi?roomId=5678&password=party')).toEqual({
            roomId: '5678',
            password: 'party',
        });
    });

    it('parses relative URLs via fallback base', () => {
        expect(parseRoomFromScan('/?roomId=9999')).toEqual({ roomId: '9999' });
    });

    it('rejects URLs with invalid roomId param', () => {
        expect(parseRoomFromScan('https://vkara.app?roomId=12')).toBeNull();
    });

    it('parses vkara compact payloads with optional password', () => {
        expect(parseRoomFromScan('vkara:1234:my:secret')).toEqual({
            roomId: '1234',
            password: 'my:secret',
        });
        expect(parseRoomFromScan('VKARA:5678')).toEqual({ roomId: '5678' });
    });

    it('rejects malformed vkara payloads', () => {
        expect(parseRoomFromScan('vkara:12')).toBeNull();
        expect(parseRoomFromScan('vkara:')).toBeNull();
    });
});

describe('encodeRoomQrPayload', () => {
    it('round-trips room id and password', () => {
        const encoded = encodeRoomQrPayload('4821', 'party');
        expect(parseRoomFromScan(encoded)).toEqual({ roomId: '4821', password: 'party' });
    });

    it('omits password segment when not provided', () => {
        expect(encodeRoomQrPayload('4821')).toBe('vkara:4821');
    });
});

describe('parseRoomFromScan hostile inputs', () => {
    const reject = [
        'javascript:alert(1)',
        'data:text/plain,1234',
        'vkara:12',
        'vkara:12345',
        'roomId=1234',
        '\0\0\0\0',
        '🔥🔥🔥🔥',
        'a'.repeat(10_000),
    ];

    it.each(reject)('returns null for %j', (input) => {
        expect(parseRoomFromScan(input)).toBeNull();
    });

    it('does not treat roomId in wrong query param as valid', () => {
        expect(parseRoomFromScan('https://vkara.app?room=1234')).toBeNull();
    });

    it('accepts valid roomId on any https host (caller must trust QR source)', () => {
        expect(parseRoomFromScan('https://evil.test?roomId=1234')).toEqual({
            roomId: '1234',
        });
    });
});
