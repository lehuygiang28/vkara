import type { PlaylistDetailsResponse } from '@vkara/shared-types';
import { getYouTubeThumbnailUrl } from '@vkara/shared-utils';

/** True when URL was synthesized with a playlist list id as a video id (invalid image). */
function isSyntheticPlaylistThumb(url: string, playlistId: string): boolean {
    return url.includes(`/vi/${playlistId}/`);
}

/**
 * Playlist card image: prefer real playlist art from YouTube, else first track thumbnail.
 */
export function resolveCuratedPlaylistThumbnail(
    details: PlaylistDetailsResponse | undefined,
    listId: string,
): string | null {
    if (!details) {
        return null;
    }

    for (const variant of details.playlist.thumbnails ?? []) {
        if (variant.url && !isSyntheticPlaylistThumb(variant.url, listId)) {
            return variant.url;
        }
    }

    const firstVideo = details.videos[0];
    if (firstVideo) {
        return getYouTubeThumbnailUrl(firstVideo.thumbnails, 'list', firstVideo.id);
    }

    return null;
}
