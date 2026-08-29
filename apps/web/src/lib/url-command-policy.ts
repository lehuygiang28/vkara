import { isExpPast } from '@vkara/url-commands';
import type { UrlCommandDocument } from '@vkara/validators';

export function documentHasMutation(document: UrlCommandDocument): boolean {
    return Boolean(document.queue || document.play || document.next);
}

export function documentRequiresAgentName(document: UrlCommandDocument): boolean {
    return document.agent === '1' || documentHasMutation(document);
}

export function canApplyMutations(document: UrlCommandDocument): boolean {
    if (!documentHasMutation(document)) {
        return false;
    }
    if (!document.roomId || !document.once) {
        return false;
    }
    if (documentRequiresAgentName(document) && !document.name) {
        return false;
    }
    if (isExpPast(document.exp)) {
        return false;
    }
    return true;
}

export function canApplySessionPrefs(isDedicatedTv: boolean): boolean {
    return !isDedicatedTv;
}

export function mutationMatchesRoom(
    document: UrlCommandDocument,
    liveRoomId?: string | null,
): boolean {
    return Boolean(document.roomId && liveRoomId && document.roomId === liveRoomId);
}
