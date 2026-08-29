import {
    IDENTITY_STRIP_KEYS,
    ONE_SHOT_STRIP_KEYS,
    SECRET_STRIP_KEYS,
    SESSION_STRIP_KEYS,
    searchParamsToQuery,
    stripCommandKeys,
} from '@vkara/url-commands';

export type UrlStripPhase = 'secrets' | 'join-success' | 'join-failure' | 'session' | 'one-shot';

const PHASE_KEYS: Record<UrlStripPhase, readonly string[]> = {
    secrets: SECRET_STRIP_KEYS,
    'join-success': IDENTITY_STRIP_KEYS,
    'join-failure': [...SECRET_STRIP_KEYS, ...ONE_SHOT_STRIP_KEYS],
    session: SESSION_STRIP_KEYS,
    'one-shot': ONE_SHOT_STRIP_KEYS,
};

export function keysForStripPhase(phase: UrlStripPhase): readonly string[] {
    return PHASE_KEYS[phase];
}

export function buildStrippedSearch(
    search: URLSearchParams | string,
    phases: readonly UrlStripPhase[],
): URLSearchParams {
    const keys = [...new Set(phases.flatMap((phase) => [...PHASE_KEYS[phase]]))];
    return stripCommandKeys(search, keys);
}

export function buildReplacedUrl(pathname: string, search: URLSearchParams): string {
    return `${pathname}${searchParamsToQuery(search)}`;
}

export function shouldStripJoinIdentity({
    liveRoomId,
    commandRoomId,
    sessionReady,
}: {
    liveRoomId?: string | null;
    commandRoomId?: string;
    sessionReady: boolean;
}): boolean {
    if (!sessionReady || !liveRoomId) {
        return false;
    }
    if (commandRoomId && commandRoomId !== liveRoomId) {
        return false;
    }
    return true;
}
