import type { UrlCommandDocument } from '@vkara/validators';

import { URL_COMMAND_KNOWN_KEYS } from './keys';

export function serializeUrlCommands(
    document: UrlCommandDocument,
    extras?: URLSearchParams | Record<string, string>,
): URLSearchParams {
    const params = new URLSearchParams();

    const omitPassword = Boolean(document.joinToken);

    for (const key of URL_COMMAND_KNOWN_KEYS) {
        if (key === 'password' && omitPassword) {
            continue;
        }
        const value = document[key];
        if (value === undefined || value === '') {
            continue;
        }
        params.set(key, String(value));
    }

    if (extras instanceof URLSearchParams) {
        for (const [key, value] of extras.entries()) {
            if (!params.has(key) && value) {
                params.set(key, value);
            }
        }
    } else if (extras) {
        for (const [key, value] of Object.entries(extras)) {
            if (!params.has(key) && value) {
                params.set(key, value);
            }
        }
    }

    return params;
}
