import { afterEach, describe, expect, it, vi } from 'vitest';

import { isExpPast, parseUrlCommands } from '../src/parse';

describe('parseUrlCommands', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('parses a valid invite', () => {
        const result = parseUrlCommands('roomId=4821&password=secret');
        expect(result.document).toEqual({ roomId: '4821', password: 'secret' });
        expect(result.droppedKeys).toEqual([]);
    });

    it('drops an invalid layoutMode and keeps q', () => {
        const result = parseUrlCommands({ layoutMode: 'tablet', q: 'hello' });
        expect(result.document.layoutMode).toBeUndefined();
        expect(result.document.q).toBe('hello');
        expect(result.droppedKeys).toContain('layoutMode');
    });

    it('keeps unknown keys out of the document', () => {
        const result = parseUrlCommands('roomId=4821&foo=bar&launch=171');
        expect(result.document.roomId).toBe('4821');
        expect(result.unknownKeys).toEqual(['foo']);
        expect(result.reservedKeys).toEqual(['launch']);
    });

    it('prefers joinToken over password', () => {
        const result = parseUrlCommands({
            roomId: '4821',
            password: 'secret',
            joinToken: 'abcdefgh',
        });
        expect(result.document.joinToken).toBe('abcdefgh');
        expect(result.document.password).toBeUndefined();
    });

    it('drops queue/play/next when once is missing', () => {
        const result = parseUrlCommands({ roomId: '4821', queue: 'abc123' });
        expect(result.document.queue).toBeUndefined();
        expect(result.droppedKeys).toContain('queue');
        expect(result.document.roomId).toBe('4821');
    });

    it('clamps name to 40 characters', () => {
        const result = parseUrlCommands({ name: `  ${'x'.repeat(50)}  ` });
        expect(result.document.name).toHaveLength(40);
    });

    it('drops mutations when exp is in the past', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-29T00:00:00Z'));
        const result = parseUrlCommands({
            roomId: '4821',
            queue: 'vid',
            once: 'abcdefgh',
            exp: '1000',
        });
        expect(result.document.queue).toBeUndefined();
        expect(result.document.once).toBeUndefined();
        expect(result.droppedKeys).toContain('queue');
    });

    it('treats an empty query as a no-op document', () => {
        expect(parseUrlCommands('').document).toEqual({});
        expect(parseUrlCommands('?').document).toEqual({});
    });

    it('drops next when once is missing and keeps roomId', () => {
        const result = parseUrlCommands({ roomId: '4821', next: '1' });
        expect(result.document.next).toBeUndefined();
        expect(result.document.roomId).toBe('4821');
        expect(result.droppedKeys).toContain('next');
    });

    it('keeps queue and play when once is present', () => {
        const result = parseUrlCommands({
            roomId: '4821',
            queue: 'aaa',
            play: 'bbb',
            once: 'abcdefgh',
            name: 'Claude',
        });
        expect(result.document.queue).toBe('aaa');
        expect(result.document.play).toBe('bbb');
        expect(result.document.once).toBe('abcdefgh');
    });

    it('ignores destructive and identity-spoof keys', () => {
        const result = parseUrlCommands(
            'roomId=4821&deviceId=evil&closeRoom=1&clearQueue=1&redirect=https://evil.example',
        );
        expect(result.document.roomId).toBe('4821');
        expect(result.document).not.toHaveProperty('deviceId');
        expect(result.document).not.toHaveProperty('closeRoom');
        expect(result.unknownKeys).toEqual(
            expect.arrayContaining(['deviceId', 'closeRoom', 'clearQueue', 'redirect']),
        );
    });

    it('drops invalid enum values without failing the rest', () => {
        const result = parseUrlCommands({
            roomId: '4821',
            karaoke: 'yes',
            provider: 'spotify',
            tab: 'chat',
            layoutMode: 'tablet',
            q: 'ok',
        });
        expect(result.document).toEqual({ roomId: '4821', q: 'ok' });
        expect(result.droppedKeys).toEqual(
            expect.arrayContaining(['karaoke', 'provider', 'tab', 'layoutMode']),
        );
    });

    it('keeps join fields when agent=1 has no name', () => {
        const result = parseUrlCommands({ roomId: '4821', agent: '1' });
        expect(result.document).toEqual({ roomId: '4821', agent: '1' });
    });

    it('does not treat exp equal to now as past', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-29T00:00:00Z'));
        const now = Math.floor(Date.now() / 1000);
        const result = parseUrlCommands({
            roomId: '4821',
            queue: 'vid',
            once: 'abcdefgh',
            exp: String(now),
        });
        expect(result.document.queue).toBe('vid');
        expect(isExpPast(now, now)).toBe(false);
        expect(isExpPast(now - 1, now)).toBe(true);
        expect(isExpPast(undefined, now)).toBe(false);
    });
});
