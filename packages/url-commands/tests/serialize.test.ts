import { describe, expect, it } from 'vitest';

import { parseUrlCommands } from '../src/parse';
import { serializeUrlCommands } from '../src/serialize';
import { stripCommandKeys } from '../src/strip';

describe('serializeUrlCommands', () => {
    it('round-trips a document and unknown extras', () => {
        const parsed = parseUrlCommands('roomId=4821&q=hello&foo=bar');
        const params = serializeUrlCommands(parsed.document, { foo: 'bar' });
        expect(params.get('roomId')).toBe('4821');
        expect(params.get('q')).toBe('hello');
        expect(params.get('foo')).toBe('bar');
    });

    it('omits password when joinToken is set', () => {
        const params = serializeUrlCommands({
            roomId: '4821',
            password: 'secret',
            joinToken: 'abcdefgh',
        });
        expect(params.get('joinToken')).toBe('abcdefgh');
        expect(params.get('password')).toBeNull();
    });
});

describe('stripCommandKeys', () => {
    it('keeps launch and unknown keys', () => {
        const remaining = stripCommandKeys('roomId=4821&password=secret&launch=9&foo=bar', [
            'roomId',
            'password',
        ]);
        expect(remaining.get('roomId')).toBeNull();
        expect(remaining.get('launch')).toBe('9');
        expect(remaining.get('foo')).toBe('bar');
    });
});
