/** Four-digit numeric room IDs used across client and server. */
export const ROOM_ID_LENGTH = 4;
export const ROOM_ID_PATTERN = new RegExp(`^\\d{${ROOM_ID_LENGTH}}$`);

export function isValidRoomId(roomId?: string | null): boolean {
    if (!roomId) {
        return false;
    }
    return ROOM_ID_PATTERN.test(roomId);
}

/** Plain-text password for invite links (from server room state or create form). */
export function resolveRoomPasswordForShare(
    roomPassword?: string,
    fallbackPassword?: string,
): string {
    const fromRoom = roomPassword?.trim();
    if (fromRoom) {
        return fromRoom;
    }
    return fallbackPassword?.trim() ?? '';
}

/**
 * Build a shareable room invite URL (no browser APIs).
 * Example: `https://example.com/vi?roomId=1234&password=secret`
 */
export function buildShareableRoomUrl({
    baseUrl,
    roomId,
    password,
}: {
    baseUrl: string;
    roomId: string;
    password?: string;
}): string {
    const params = new URLSearchParams({ roomId });
    const normalizedPassword = password?.trim();
    if (normalizedPassword) {
        params.set('password', normalizedPassword);
    }
    const normalizedBase = baseUrl.replace(/\/$/, '');
    return `${normalizedBase}?${params.toString()}`;
}
