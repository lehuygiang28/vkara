/**
 * Format a duration in seconds into a human-readable string (MM:SS or HH:MM:SS).
 */
export function formatSeconds(durationInSeconds?: number | null): string {
    if (
        durationInSeconds === null ||
        durationInSeconds === undefined ||
        Number.isNaN(durationInSeconds) ||
        durationInSeconds < 0
    ) {
        return '00:00';
    }

    const totalSeconds = Math.floor(durationInSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format view counts with K/M/B/T suffixes (e.g. 1.2M).
 */
export function formatViewCount(viewCount: number): string {
    if (Number.isNaN(viewCount) || viewCount < 0) {
        return '0';
    }

    const units = ['', 'K', 'M', 'B', 'T'];
    let unitIndex = 0;
    let count = viewCount;

    while (count >= 1000 && unitIndex < units.length - 1) {
        count /= 1000;
        unitIndex++;
    }

    if (Math.abs(count - Math.round(count)) < 0.01) {
        count = Math.round(count);
    }

    const formattedCount = count % 1 === 0 ? count.toFixed(0) : count.toFixed(1);
    return `${formattedCount}${units[unitIndex]}`;
}
