import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Video } from 'youtube-sr';
import { VideoCompact } from 'youtubei';

import { YouTubeVideo } from '@/types/youtube.type';

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
 * Format a view count number into a human-readable string with commas as thousands separators and with metric prefixes (K, M, B, T).
 *
 * If the input is negative or NaN, returns '0'.
 *
 * Otherwise, returns a string representation of the number with a metric prefix if the number is greater than 1000.
 *
 * @example
 * formatViewCount(0) // '0'
 * formatViewCount(1000) // '1K'
 * formatViewCount(1000000) // '1M'
 */
export function formatViewCount(viewCount: number): string {
    if (isNaN(viewCount) || viewCount < 0) {
        return '0';
    }

    const units = ['', 'K', 'M', 'B', 'T'];
    let unitIndex = 0;
    let count = viewCount;

    while (count >= 1000 && unitIndex < units.length - 1) {
        count /= 1000;
        unitIndex++;
    }

    // Round numbers very close to an integer to that integer
    if (Math.abs(count - Math.round(count)) < 0.01) {
        count = Math.round(count);
    }

    const formattedCount = count % 1 === 0 ? count.toFixed(0) : count.toFixed(1);

    return `${formattedCount}${units[unitIndex]}`;
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
        ...(password && { password }),
        ...(layoutMode && { layoutMode }),
    });

    return `${baseUrl}?${params.toString()}`;
}

/**
 * Checks if a room ID is valid.
 *
 * A valid room ID must be exactly 6 characters long and contain only digits.
 *
 * @param roomId - The room ID to validate.
 * @returns `true` if the room ID is valid, otherwise `false`.
 */

export function isValidRoomId(roomId?: string | null | undefined): boolean {
    if (!roomId) return false;
    const pattern = /^\d{6}$/;
    return pattern.test(roomId);
}

/**
 * Removes a trailing slash from a URL, if present.
 *
 * @param {string} url - The URL to resolve.
 * @returns {string} The resolved URL.
 */
export function resolveUrl(url: string, isWebsocket = false): string {
    if (isWebsocket) {
        const wsUrl = url.replace(/(https?:\/\/)/, (scheme) =>
            scheme === 'https://' ? 'wss://' : 'ws://',
        );
        return wsUrl.replace(/\/$/, '');
    }
    return url.replace(/\/$/, '');
}

/**
 * Takes a YouTube video object and cleans up its fields to match the YouTubeVideo
 * type, which is used throughout the application.
 *
 * @param {Video} video The YouTube video object.
 * @returns {YouTubeVideo} The cleaned up YouTube video object.
 * @example
 * const video = YouTubeVideo.fromURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * const cleanVideo = cleanUpVideoField(video);
 * console.log(cleanVideo);
 * // {
 * //   id: 'dQw4w9WgXcQ',
 * //   duration: 213,
 * //   duration_formatted: '3:33',
 * //   title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
 * //   type: 'video',
 * //   uploadedAt: '2009-10-24T07:32:03.000Z',
 * //   url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 * //   views: 123456,
 * //   channel: {
 * //     name: 'Rick Astley',
 * //     verified: true,
 * //   },
 * //   thumbnail: {
 * //     url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
 * //   },
 * // }
 */
export function cleanUpVideoField(video: Video): YouTubeVideo {
    const videoJSON = video.toJSON();
    const channel = video.channel?.toJSON();

    return {
        id: videoJSON.id,
        duration: videoJSON.duration,
        duration_formatted: videoJSON.duration_formatted || '0:00',
        title: videoJSON.title,
        type: videoJSON.type,
        uploadedAt: videoJSON.uploadedAt,
        url: videoJSON.url,
        views: videoJSON.views,
        channel: {
            name: channel?.name || '',
            verified: video.channel?.verified || false,
        },
        thumbnail: {
            url: videoJSON.thumbnail.url || '',
        },
    };
}

export const mapYoutubeiVideo = (video: VideoCompact): YouTubeVideo => ({
    id: video.id,
    duration: video.duration || 0,
    duration_formatted: formatSeconds(video?.duration || 0),
    thumbnail: {
        url: video.thumbnails[0].url,
    },
    title: video.title,
    type: 'video',
    url: '',
    uploadedAt: video.uploadDate || '',
    views: video.viewCount || 0,
    channel: {
        name: video.channel?.name || 'N/A',
        verified: false,
    },
});
