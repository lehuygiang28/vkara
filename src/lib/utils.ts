import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format a duration in seconds into a human-readable string
 *
 * If the input is negative or NaN, returns '00:00'.
 *
 * Otherwise, returns a string of the form 'HH:MM:SS', 'MM:SS', or 'SS', depending on the magnitude of the duration.
 *
 * @example
 * formatSeconds(0) // '00'
 * formatSeconds(42) // '42'
 * formatSeconds(60) // '01:00'
 * formatSeconds(3600) // '01:00:00'
 */
export function formatSeconds(durationInSeconds: number): string {
    if (isNaN(durationInSeconds) || durationInSeconds < 0) return '00:00';

    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = durationInSeconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${seconds.toString().padStart(2, '0')}`;
    }
}

/**
 * Format a view count number into a human-readable string with commas as thousands separators.
 *
 * If the input is negative or NaN, returns '0'.
 *
 * Otherwise, returns a string representation of the number with commas separating thousands.
 *
 * @example
 * formatViewCount(0) // '0'
 * formatViewCount(1000) // '1,000'
 * formatViewCount(1000000) // '1,000,000'
 */

export function formatViewCount(viewCount: number): string {
    if (isNaN(viewCount) || viewCount < 0) {
        return '0';
    }

    return viewCount.toLocaleString('en-US');
}

/**
 * Generate a shareable URL that includes the given room ID, password, and optional
 * layout mode. The returned URL is of the form:
 *
 * <baseUrl>?roomId=<roomId>&password=<password>[&layoutMode=<layoutMode>]
 *
 * @param {Object} options - An object containing the parameters to include in the shareable URL.
 * @param {string} options.roomId - The room ID to include in the shareable URL.
 * @param {string} options.password - The password to include in the shareable URL.
 * @param {string} [options.layoutMode] - The optional layout mode to include in the shareable URL.
 * @returns {string} A shareable URL that includes the given parameters.
 */
export function generateShareableUrl({
    roomId,
    password,
    layoutMode,
}: {
    roomId: string;
    password: string;
    layoutMode?: string;
}): string {
    const baseUrl = window?.location.origin ?? '';
    const params = new URLSearchParams({
        roomId,
        password,
        ...(layoutMode && { layoutMode }),
    });

    return `${baseUrl}?${params.toString()}`;
}

/**
 * Checks if a room ID is valid.
 *
 * A valid room ID must be exactly 8 characters long and contain only digits.
 *
 * @param roomId - The room ID to validate.
 * @returns `true` if the room ID is valid, otherwise `false`.
 */

export function isValidRoomId(roomId?: string | null | undefined): boolean {
    if (!roomId) return false;
    const pattern = /^\d{8}$/;
    return pattern.test(roomId);
}
