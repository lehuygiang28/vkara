import { describe, expect, it } from 'vitest';

import { resolveUrl, resolveWebSocketEndpoint } from '../src/url';

describe('resolveUrl', () => {
    it('strips trailing slash from http URLs', () => {
        expect(resolveUrl('https://api.example.com/')).toBe('https://api.example.com');
    });

    it('maps http to ws and https to wss', () => {
        expect(resolveUrl('http://localhost:8000/', true)).toBe('ws://localhost:8000');
        expect(resolveUrl('https://api.example.com/v1/', true)).toBe('wss://api.example.com/v1');
    });
});

describe('resolveWebSocketEndpoint', () => {
    it('appends /ws when the base URL has no ws path', () => {
        expect(resolveWebSocketEndpoint('ws://localhost:8000')).toBe('ws://localhost:8000/ws');
        expect(resolveWebSocketEndpoint('http://localhost:8000/')).toBe('ws://localhost:8000/ws');
    });

    it('does not duplicate /ws when already present', () => {
        expect(resolveWebSocketEndpoint('ws://localhost:8000/ws')).toBe('ws://localhost:8000/ws');
        expect(resolveWebSocketEndpoint('ws://localhost:8000/ws/')).toBe('ws://localhost:8000/ws');
        expect(resolveWebSocketEndpoint('https://api.example.com/ws')).toBe(
            'wss://api.example.com/ws',
        );
    });
});
