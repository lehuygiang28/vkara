import { describe, expect, it } from 'vitest';

import {
    consumeOnce,
    consumeOnceInBoth,
    documentIntentHash,
    generateOnceToken,
    isOnceConsumed,
    isOnceToken,
} from '../src/consume';

function memoryStorage(): {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
} {
    const map = new Map<string, string>();
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
    };
}

describe('consumeOnce', () => {
    it('consumes a token only once', () => {
        const storage = memoryStorage();
        const token = generateOnceToken();
        expect(consumeOnce(token, storage)).toBe(true);
        expect(isOnceConsumed(token, storage)).toBe(true);
        expect(consumeOnce(token, storage)).toBe(false);
    });

    it('rejects a token that is not a once token', () => {
        const storage = memoryStorage();
        expect(consumeOnce('short', storage)).toBe(false);
        expect(isOnceConsumed('short', storage)).toBe(false);
    });

    it('generates a token the parser accepts', () => {
        expect(isOnceToken(generateOnceToken())).toBe(true);
    });
});

describe('consumeOnceInBoth', () => {
    it('writes the token to session and local, then refuses a replay', () => {
        const session = memoryStorage();
        const local = memoryStorage();
        const token = generateOnceToken();
        expect(consumeOnceInBoth(token, { session, local })).toBe(true);
        expect(isOnceConsumed(token, session)).toBe(true);
        expect(isOnceConsumed(token, local)).toBe(true);
        expect(consumeOnceInBoth(token, { session, local })).toBe(false);
    });

    it('refuses when either storage already holds the token', () => {
        const session = memoryStorage();
        const local = memoryStorage();
        const token = generateOnceToken();
        consumeOnce(token, local);
        expect(consumeOnceInBoth(token, { session, local })).toBe(false);
        expect(isOnceConsumed(token, session)).toBe(false);
    });
});

describe('documentIntentHash', () => {
    it('is stable for the same session prefs', () => {
        const a = documentIntentHash({ roomId: '4821', q: 'hello', karaoke: '1' });
        const b = documentIntentHash({ roomId: '4821', q: 'hello', karaoke: '1' });
        expect(a).toBe(b);
        expect(a).not.toBe(documentIntentHash({ roomId: '4821', q: 'hello', karaoke: '0' }));
    });
});
