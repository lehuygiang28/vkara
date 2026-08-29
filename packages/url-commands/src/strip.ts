import { URL_COMMAND_RESERVED_KEYS } from './keys';

/** Delete consumed command keys; reserved (`launch`) and unknown keys stay. */
export function stripCommandKeys(
    search: URLSearchParams | string,
    keysToDelete: readonly string[],
): URLSearchParams {
    const params = new URLSearchParams(search);
    const reserved = new Set<string>(URL_COMMAND_RESERVED_KEYS);
    for (const key of keysToDelete) {
        if (reserved.has(key)) {
            continue;
        }
        params.delete(key);
    }
    return params;
}

export function searchParamsToQuery(params: URLSearchParams): string {
    const query = params.toString();
    return query ? `?${query}` : '';
}
