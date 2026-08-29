import { describe, expect, it } from 'vitest';

import {
    canApplyMutations,
    canApplySessionPrefs,
    mutationMatchesRoom,
} from '@/lib/url-command-policy';

describe('url command policy', () => {
    it('refuses next without a display name', () => {
        expect(
            canApplyMutations({
                roomId: '4821',
                next: '1',
                once: 'abcdefgh',
            }),
        ).toBe(false);
    });

    it('refuses a document with no mutation', () => {
        expect(canApplyMutations({ roomId: '4821', name: 'Claude', q: 'hello' })).toBe(false);
    });

    it('refuses mutations without once, roomId, or name', () => {
        expect(canApplyMutations({ queue: 'abc' })).toBe(false);
        expect(canApplyMutations({ roomId: '4821', queue: 'abc', once: 'abcdefgh' })).toBe(false);
        expect(
            canApplyMutations({
                roomId: '4821',
                queue: 'abc',
                once: 'abcdefgh',
                name: 'Claude',
            }),
        ).toBe(true);
    });

    it('refuses a wrong-room mutation', () => {
        expect(
            mutationMatchesRoom({ roomId: '2222', queue: 'abc', once: 'abcdefgh' }, '1111'),
        ).toBe(false);
        expect(
            mutationMatchesRoom({ roomId: '1111', queue: 'abc', once: 'abcdefgh' }, '1111'),
        ).toBe(true);
    });

    it('skips session prefs on dedicated TV', () => {
        expect(canApplySessionPrefs(true)).toBe(false);
        expect(canApplySessionPrefs(false)).toBe(true);
    });

    it('refuses mutations after exp even if the snapshot still holds the act', () => {
        const expired = Math.floor(Date.now() / 1000) - 30;
        expect(
            canApplyMutations({
                roomId: '4821',
                queue: 'abc',
                once: 'abcdefgh',
                name: 'Claude',
                exp: expired,
            }),
        ).toBe(false);
        expect(
            canApplyMutations({
                roomId: '4821',
                queue: 'abc',
                once: 'abcdefgh',
                name: 'Claude',
                exp: Math.floor(Date.now() / 1000) + 60,
            }),
        ).toBe(true);
    });
});
