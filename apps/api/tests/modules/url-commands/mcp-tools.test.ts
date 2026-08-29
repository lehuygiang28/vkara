import { describe, expect, it } from 'vitest';

import { parseUrlCommands } from '@vkara/url-commands';

import { buildBoundCommandUrl, mintOnce } from '@/modules/url-commands/tools';

const bind = { roomId: '4821', displayName: 'Claude' };

describe('url-command MCP tools', () => {
    it('build_url round-trips through parseUrlCommands', () => {
        const { url, bind: echoed } = buildBoundCommandUrl({
            origin: 'https://vkara.example',
            path: '/en',
            command: { q: 'son tung', karaoke: '1' },
            bind,
        });
        expect(echoed).toEqual(bind);
        const parsed = parseUrlCommands(new URL(url).searchParams);
        expect(parsed.document.roomId).toBe('4821');
        expect(parsed.document.name).toBe('Claude');
        expect(parsed.document.q).toBe('son tung');
        expect(parsed.document.karaoke).toBe('1');
    });

    it('refuses a mutating URL for a different room', () => {
        expect(() =>
            buildBoundCommandUrl({
                origin: 'https://vkara.example',
                path: '/',
                command: { roomId: '9999', queue: 'abc', once: 'abcdefgh' },
                bind,
            }),
        ).toThrow(/different roomId/);
    });

    it('refuses password on MCP build-url', () => {
        expect(() =>
            buildBoundCommandUrl({
                origin: 'https://vkara.example',
                path: '/',
                command: { roomId: '4821', password: 'secret' },
                bind,
            }),
        ).toThrow(/password/i);
    });

    it('builds a joinToken URL without embedding password', () => {
        const { url } = buildBoundCommandUrl({
            origin: 'https://vkara.example',
            path: '/',
            command: { roomId: '4821', joinToken: 'abcdefgh' },
            bind,
        });
        const parsed = parseUrlCommands(new URL(url).searchParams);
        expect(parsed.document.joinToken).toBe('abcdefgh');
        expect(parsed.document.password).toBeUndefined();
        expect(url).not.toContain('password');
    });

    it('mints an once token agents can put on a queue URL', () => {
        const { once } = mintOnce();
        expect(once.length).toBeGreaterThanOrEqual(8);
        expect(
            parseUrlCommands(`roomId=4821&queue=abc&once=${once}&name=Claude`).document.once,
        ).toBe(once);
    });

    it('fills name and once on a mutating URL from the bind', () => {
        const { url } = buildBoundCommandUrl({
            origin: 'https://vkara.example',
            path: '/',
            command: { queue: 'abc' },
            bind,
        });
        const parsed = parseUrlCommands(new URL(url).searchParams);
        expect(parsed.document.roomId).toBe('4821');
        expect(parsed.document.name).toBe('Claude');
        expect(parsed.document.once).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
        expect(parsed.document.queue).toBe('abc');
    });

    it('refuses destructive URL verbs', () => {
        expect(() =>
            buildBoundCommandUrl({
                origin: 'https://vkara.example',
                path: '/',
                command: { roomId: '4821', clearQueue: '1' } as never,
                bind,
            }),
        ).toThrow(/clearQueue/);
    });
});
