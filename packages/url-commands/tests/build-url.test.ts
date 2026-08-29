import { describe, expect, it } from 'vitest';

import { buildCommandUrl } from '../src/build-url';
import { parseUrlCommands } from '../src/parse';

describe('buildCommandUrl', () => {
    it('builds a parseable command URL', () => {
        const url = buildCommandUrl({
            origin: 'https://vkara.example',
            path: '/en',
            command: { roomId: '4821', name: 'Claude', q: 'son tung' },
        });
        expect(url).toBe('https://vkara.example/en?roomId=4821&q=son+tung&name=Claude');
        expect(parseUrlCommands(new URL(url).searchParams).document).toEqual({
            roomId: '4821',
            name: 'Claude',
            q: 'son tung',
        });
    });

    it('rejects a non-origin base', () => {
        expect(() =>
            buildCommandUrl({
                origin: 'https://evil.example/phish',
                path: '/',
                command: { roomId: '4821' },
            }),
        ).toThrow(/origin/);
    });

    it('builds a /tv URL without a query when the document is empty', () => {
        expect(
            buildCommandUrl({
                origin: 'https://vkara.example',
                path: '/tv',
                command: {},
            }),
        ).toBe('https://vkara.example/tv');
    });

    it('rejects a path outside the allowlist', () => {
        expect(() =>
            buildCommandUrl({
                origin: 'https://vkara.example',
                path: '/admin' as never,
                command: { roomId: '4821' },
            }),
        ).toThrow(/path/);
    });

    it('refuses destructive extras', () => {
        expect(() =>
            buildCommandUrl({
                origin: 'https://vkara.example',
                path: '/',
                command: { roomId: '4821' },
                extraParams: { clearQueue: '1' },
            }),
        ).toThrow(/clearQueue/);
    });
});
