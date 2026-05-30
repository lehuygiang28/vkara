import { Video } from 'youtube-sr';
import { normalizeVideoChannels, type Room, type YouTubeVideo } from '@vkara/shared-types';

/**
 * Generates a random number with a specified number of digits.
 * @param {Object} [options] An object with options.
 * @param {number} [options.digits=6] The number of digits to use for the random number.
 * @returns {number} The generated number.
 * @example
 * const randomNumber = generateRandomNumber({ digits: 4 });
 * // randomNumber might be 8359
 */
export function generateRandomNumber({ digits = 6 }: { digits?: number } = {}): number {
    const min = 10 ** (digits - 1);
    const max = 9 * 10 ** (digits - 1);

    return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Shuffles an array in-place.
 * @param array The array to shuffle.
 * @returns The shuffled array.
 * @example
 * const array = [1, 2, 3];
 * shuffleArray(array);
 * console.log(array); // [2, 1, 3]
 */
export function shuffleArray<T>(array: T[]): T[] {
    if (!Array.isArray(array)) {
        return array;
    }

    if (array.length === 0 || array.length === 1) {
        return array;
    }

    if (array.length === 2) {
        return [array[1], array[0]];
    }

    return array.sort(() => Math.random() - 0.5);
}

/**
 * Checks if a given value is null or undefined.
 * @param value The value to check.
 * @returns A boolean indicating whether the value is null or undefined.
 * @example
 * isNullish(null); // true
 * isNullish(undefined); // true
 * isNullish(0); // false
 */

export function isNullish<T>(value: T | null | undefined): value is null | undefined {
    return value === null || value === undefined;
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
    const name = channel?.name || '';
    const verified = video.channel?.verified || channel?.verified || false;

    return {
        id: videoJSON.id,
        duration: videoJSON.duration || video.duration || 0,
        duration_formatted: videoJSON.duration_formatted || '0:00',
        title: videoJSON.title,
        type: videoJSON.type,
        uploadedAt: videoJSON.uploadedAt,
        url: videoJSON.url,
        views: videoJSON.views || video.views || 0,
        channels: name ? [{ name, verified }] : [{ name: '—', verified: false }],
        thumbnail: {
            url: videoJSON.thumbnail.url || '',
        },
        isLive: Boolean(videoJSON.live ?? video.live),
    };
}

type VideoWithLegacyChannel = YouTubeVideo & {
    channel?: { name: string; verified?: boolean };
};

export function sanitizeVideoForClient(video: VideoWithLegacyChannel): YouTubeVideo {
    const { channel: _legacyChannel, ...rest } = video;
    return {
        ...rest,
        channels: normalizeVideoChannels(video),
    };
}

export function cleanUpRoomField(room: Room): Omit<Room, 'clients'> {
    const { clients, ...cleanedRoom } = room;
    return {
        ...cleanedRoom,
        playingNow: cleanedRoom.playingNow
            ? sanitizeVideoForClient(cleanedRoom.playingNow as VideoWithLegacyChannel)
            : null,
        videoQueue: cleanedRoom.videoQueue.map((video) =>
            sanitizeVideoForClient(video as VideoWithLegacyChannel),
        ),
        historyQueue: cleanedRoom.historyQueue.map((video) =>
            sanitizeVideoForClient(video as VideoWithLegacyChannel),
        ),
    };
}

export { formatSeconds } from '@vkara/shared-utils';
