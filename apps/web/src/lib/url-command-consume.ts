import {
    consumeIntent,
    consumeOnceInBoth,
    documentIntentHash,
    isIntentConsumed,
    type ParseUrlCommandsResult,
} from '@vkara/url-commands';

function browserStorages(): { session: Storage; local: Storage } | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return { session: window.sessionStorage, local: window.localStorage };
    } catch {
        return null;
    }
}

/** Consume `once` in both storages. False if either already has the token. */
export function consumeCommandOnce(token: string): boolean {
    const storages = browserStorages();
    if (!storages) {
        return false;
    }
    return consumeOnceInBoth(token, storages);
}

export function consumeSessionIntent(snapshot: ParseUrlCommandsResult): boolean {
    const storages = browserStorages();
    if (!storages) {
        return false;
    }
    const hash = documentIntentHash(snapshot.document);
    if (isIntentConsumed(hash, storages.session)) {
        return false;
    }
    consumeIntent(hash, storages.session);
    return true;
}
