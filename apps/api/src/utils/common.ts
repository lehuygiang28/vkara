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
