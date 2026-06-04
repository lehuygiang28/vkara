/** YouTube watch/embed IDs are exactly 11 URL-safe characters (not channel UC… or playlist PL… IDs). */
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYoutubeVideoId(id: string | undefined | null): boolean {
    if (!id) {
        return false;
    }
    return YOUTUBE_VIDEO_ID_PATTERN.test(id);
}
