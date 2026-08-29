import {
    urlCommandDocumentSchema,
    urlCommandNameSchema,
    type UrlCommandDocument,
} from '@vkara/validators';

import { URL_COMMAND_KNOWN_KEYS, URL_COMMAND_RESERVED_KEYS, type UrlCommandKnownKey } from './keys';

export type SearchInput = string | URLSearchParams | Record<string, string | undefined>;

export type ParseUrlCommandsResult = {
    document: UrlCommandDocument;
    unknownKeys: string[];
    reservedKeys: string[];
    droppedKeys: string[];
};

const knownKeySet = new Set<string>(URL_COMMAND_KNOWN_KEYS);
const reservedKeySet = new Set<string>(URL_COMMAND_RESERVED_KEYS);

function toSearchParams(input: SearchInput): URLSearchParams {
    if (typeof input === 'string') {
        const trimmed = input.startsWith('?') ? input.slice(1) : input;
        return new URLSearchParams(trimmed);
    }
    if (input instanceof URLSearchParams) {
        return new URLSearchParams(input);
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
            params.set(key, value);
        }
    }
    return params;
}

function clampName(value: string): string {
    const parsed = urlCommandNameSchema.safeParse(value.trim().slice(0, 40));
    return parsed.success ? parsed.data : '';
}

function hasMutation(document: UrlCommandDocument): boolean {
    return Boolean(document.queue || document.play || document.next);
}

export function isExpPast(
    exp: number | undefined,
    nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
    return typeof exp === 'number' && exp < nowSeconds;
}

export function parseUrlCommands(input: SearchInput): ParseUrlCommandsResult {
    const params = toSearchParams(input);
    const unknownKeys: string[] = [];
    const reservedKeys: string[] = [];
    const droppedKeys: string[] = [];
    const raw: Record<string, string> = {};

    for (const key of params.keys()) {
        if (reservedKeySet.has(key)) {
            if (!reservedKeys.includes(key)) {
                reservedKeys.push(key);
            }
            continue;
        }
        if (!knownKeySet.has(key)) {
            if (!unknownKeys.includes(key)) {
                unknownKeys.push(key);
            }
            continue;
        }
        const value = params.get(key);
        if (value === null) {
            continue;
        }
        raw[key] = value;
    }

    const document: UrlCommandDocument = {};

    for (const key of URL_COMMAND_KNOWN_KEYS) {
        if (!(key in raw)) {
            continue;
        }
        if (key === 'name') {
            const name = clampName(raw.name);
            if (name) {
                document.name = name;
            } else {
                droppedKeys.push('name');
            }
            continue;
        }
        const parsed = urlCommandDocumentSchema
            .pick({ [key]: true } as Record<UrlCommandKnownKey, true>)
            .safeParse({ [key]: raw[key] });
        if (!parsed.success) {
            droppedKeys.push(key);
            continue;
        }
        Object.assign(document, parsed.data);
    }

    if (document.joinToken && document.password) {
        delete document.password;
    }

    if (hasMutation(document) && !document.once) {
        if (document.queue) {
            droppedKeys.push('queue');
            delete document.queue;
        }
        if (document.play) {
            droppedKeys.push('play');
            delete document.play;
        }
        if (document.next) {
            droppedKeys.push('next');
            delete document.next;
        }
    }

    if (hasMutation(document) && isExpPast(document.exp)) {
        if (document.queue) {
            droppedKeys.push('queue');
            delete document.queue;
        }
        if (document.play) {
            droppedKeys.push('play');
            delete document.play;
        }
        if (document.next) {
            droppedKeys.push('next');
            delete document.next;
        }
        droppedKeys.push('exp');
        delete document.exp;
        delete document.once;
    }

    return { document, unknownKeys, reservedKeys, droppedKeys };
}
