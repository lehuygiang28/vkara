import type { UrlCommandDocument } from '@vkara/validators';

import { COMMAND_PATHS, URL_COMMAND_NEVER_KEYS, type CommandPath } from './keys';
import { serializeUrlCommands } from './serialize';

function normalizeOrigin(origin: string): string {
    return origin.replace(/\/$/, '');
}

function isHttpOrigin(origin: string): boolean {
    try {
        const url = new URL(origin);
        return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === origin;
    } catch {
        return false;
    }
}

export function buildCommandUrl({
    origin,
    path,
    command,
    extraParams,
}: {
    origin: string;
    path: CommandPath;
    command: UrlCommandDocument;
    extraParams?: Record<string, string>;
}): string {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!isHttpOrigin(normalizedOrigin)) {
        throw new Error('buildCommandUrl: origin must be an http(s) origin');
    }
    if (!COMMAND_PATHS.includes(path)) {
        throw new Error('buildCommandUrl: path is not an allowed app path');
    }

    const extras = extraParams ?? {};
    for (const key of URL_COMMAND_NEVER_KEYS) {
        if (key in command || key in extras) {
            throw new Error(`buildCommandUrl: refused key "${key}"`);
        }
    }

    const params = serializeUrlCommands(command, extras);
    const query = params.toString();
    return query ? `${normalizedOrigin}${path}?${query}` : `${normalizedOrigin}${path}`;
}
