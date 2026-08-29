import { describe, expect, it } from 'vitest';

import {
    buildReplacedUrl,
    buildStrippedSearch,
    shouldStripJoinIdentity,
} from '@/lib/url-command-strip';

describe('buildStrippedSearch', () => {
    it('keeps launch and unknown keys when stripping secrets', () => {
        const remaining = buildStrippedSearch(
            'roomId=4821&password=secret&joinToken=abcdefgh&launch=9&foo=bar',
            ['secrets'],
        );
        expect(remaining.get('password')).toBeNull();
        expect(remaining.get('joinToken')).toBeNull();
        expect(remaining.get('roomId')).toBe('4821');
        expect(remaining.get('launch')).toBe('9');
        expect(remaining.get('foo')).toBe('bar');
    });

    it('keeps roomId after a failed join', () => {
        const remaining = buildStrippedSearch(
            'roomId=4821&password=secret&queue=abc&once=abcdefgh&launch=1',
            ['join-failure'],
        );
        expect(remaining.get('roomId')).toBe('4821');
        expect(remaining.get('password')).toBeNull();
        expect(remaining.get('queue')).toBeNull();
        expect(remaining.get('launch')).toBe('1');
    });

    it('strips one-shot keys and keeps session search', () => {
        const remaining = buildStrippedSearch('roomId=4821&q=hello&queue=abc&once=abcdefgh&exp=9', [
            'one-shot',
        ]);
        expect(remaining.get('queue')).toBeNull();
        expect(remaining.get('once')).toBeNull();
        expect(remaining.get('q')).toBe('hello');
        expect(remaining.get('roomId')).toBe('4821');
    });

    it('removes roomId after a matching successful join', () => {
        const remaining = buildStrippedSearch('roomId=4821&launch=1', ['join-success']);
        expect(remaining.get('roomId')).toBeNull();
        expect(remaining.get('launch')).toBe('1');
        expect(buildReplacedUrl('/en', remaining)).toBe('/en?launch=1');
    });
});

describe('shouldStripJoinIdentity', () => {
    it('does not strip on persist room id before session ready', () => {
        expect(
            shouldStripJoinIdentity({
                liveRoomId: '4821',
                commandRoomId: '4821',
                sessionReady: false,
            }),
        ).toBe(false);
    });

    it('does not strip when the live room does not match', () => {
        expect(
            shouldStripJoinIdentity({
                liveRoomId: '1111',
                commandRoomId: '2222',
                sessionReady: true,
            }),
        ).toBe(false);
    });

    it('strips after a matching roomJoined session', () => {
        expect(
            shouldStripJoinIdentity({
                liveRoomId: '4821',
                commandRoomId: '4821',
                sessionReady: true,
            }),
        ).toBe(true);
    });
});
