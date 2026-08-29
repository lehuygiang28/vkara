import { urlCommandOnceTokenSchema, type UrlCommandDocument } from '@vkara/validators';

import { INTENT_STORAGE_PREFIX, ONCE_STORAGE_PREFIX } from './keys';

export type KvStorage = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};

export function generateOnceToken(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isOnceToken(value: string): boolean {
    return urlCommandOnceTokenSchema.safeParse(value).success;
}

export function onceStorageKey(token: string): string {
    return `${ONCE_STORAGE_PREFIX}${token}`;
}

export function isOnceConsumed(token: string, storage: KvStorage): boolean {
    return storage.getItem(onceStorageKey(token)) === '1';
}

/** @returns true if this call consumed the token; false if it was already used. */
export function consumeOnce(token: string, storage: KvStorage): boolean {
    if (!isOnceToken(token)) {
        return false;
    }
    if (isOnceConsumed(token, storage)) {
        return false;
    }
    storage.setItem(onceStorageKey(token), '1');
    return true;
}

/** Consume in session + local. False if either storage already has the token. */
export function consumeOnceInBoth(
    token: string,
    storages: { session: KvStorage; local: KvStorage },
): boolean {
    if (isOnceConsumed(token, storages.session) || isOnceConsumed(token, storages.local)) {
        return false;
    }
    return consumeOnce(token, storages.session) && consumeOnce(token, storages.local);
}

export function sessionIntentHash(input: {
    roomId?: string;
    provider?: string;
    karaoke?: string;
    q?: string;
    tab?: string;
    layoutMode?: string;
}): string {
    return [
        input.roomId ?? '',
        input.provider ?? '',
        input.karaoke ?? '',
        input.q ?? '',
        input.tab ?? '',
        input.layoutMode ?? '',
    ].join('\u001f');
}

export function intentStorageKey(hash: string): string {
    return `${INTENT_STORAGE_PREFIX}${hash}`;
}

export function isIntentConsumed(hash: string, storage: KvStorage): boolean {
    return storage.getItem(intentStorageKey(hash)) === '1';
}

export function consumeIntent(hash: string, storage: KvStorage): boolean {
    if (isIntentConsumed(hash, storage)) {
        return false;
    }
    storage.setItem(intentStorageKey(hash), '1');
    return true;
}

export function documentIntentHash(document: UrlCommandDocument): string {
    return sessionIntentHash({
        roomId: document.roomId,
        provider: document.provider,
        karaoke: document.karaoke,
        q: document.q,
        tab: document.tab,
        layoutMode: document.layoutMode,
    });
}
