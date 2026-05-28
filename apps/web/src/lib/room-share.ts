import { buildShareableRoomUrl } from '@vkara/shared-utils';

/**
 * Shareable invite URL for QR codes and copy (uses current page origin + path).
 */
export function generateShareableUrl({
    roomId,
    password,
}: {
    roomId: string;
    password: string;
}): string {
    const baseUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}`
            : '';

    return buildShareableRoomUrl({
        baseUrl,
        roomId,
        password,
    });
}
