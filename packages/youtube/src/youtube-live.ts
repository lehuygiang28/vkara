/** Detect active livestreams when InnerTube omits the explicit badge flag. */
export function resolveYoutubeLiveFlag(video: {
    isLive?: boolean;
    duration?: number | null;
    uploadDate?: string | null;
    uploadedAt?: string | null;
}): boolean {
    if (video.isLive) {
        return true;
    }

    const uploadDate = video.uploadDate ?? video.uploadedAt;
    const noUpload = !uploadDate?.trim();
    const noDuration =
        video.duration === null ||
        video.duration === undefined ||
        video.duration === 0;

    return noUpload && noDuration;
}
