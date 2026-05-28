import { isValidRoomId } from '@vkara/shared-utils';

const VKARA_PREFIX = 'vkara:';

export type ParsedRoomInvite = {
    roomId: string;
    password?: string;
};

/**
 * Parse room invite from in-app QR scan: HTTPS URL with ?roomId=, vkara: payload, or 6 digits.
 */
export function parseRoomFromScan(text: string): ParsedRoomInvite | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const fromUrl = parseRoomFromUrl(trimmed);
    if (fromUrl) return fromUrl;

    const fromPayload = parseVkaraPayload(trimmed);
    if (fromPayload) return fromPayload;

    if (isValidRoomId(trimmed)) {
        return { roomId: trimmed };
    }

    return null;
}

function parseRoomFromUrl(text: string): ParsedRoomInvite | null {
    try {
        const url = text.includes('://') ? new URL(text) : new URL(text, 'https://vkara.local');
        const roomId = url.searchParams.get('roomId');
        if (!isValidRoomId(roomId)) return null;
        const password = url.searchParams.get('password') || undefined;
        return { roomId: roomId as string, password };
    } catch {
        return null;
    }
}

function parseVkaraPayload(text: string): ParsedRoomInvite | null {
    if (!text.toLowerCase().startsWith(VKARA_PREFIX)) return null;
    const rest = text.slice(VKARA_PREFIX.length);
    const [roomId, ...passwordParts] = rest.split(':');
    if (!isValidRoomId(roomId)) return null;
    const password = passwordParts.length > 0 ? passwordParts.join(':') : undefined;
    return { roomId, password: password || undefined };
}

/** Compact payload for optional in-app QR (TV uses full HTTPS URL). */
export function encodeRoomQrPayload(roomId: string, password?: string): string {
    if (password) {
        return `${VKARA_PREFIX}${roomId}:${password}`;
    }
    return `${VKARA_PREFIX}${roomId}`;
}
