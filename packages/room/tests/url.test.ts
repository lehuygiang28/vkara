import { describe, expect, it } from 'vitest';

import { resolveUrl } from '../src/url';

describe('resolveUrl', () => {
    it('strips trailing slash from http URLs', () => {
        expect(resolveUrl('https://api.example.com/')).toBe('https://api.example.com');
    });

    it('maps http to ws and https to wss', () => {
        expect(resolveUrl('http://localhost:8000/', true)).toBe('ws://localhost:8000');
        expect(resolveUrl('https://api.example.com/v1/', true)).toBe('wss://api.example.com/v1');
    });
});
