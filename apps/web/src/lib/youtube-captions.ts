import {
    pickCaptionTrack,
    type CaptionTrack,
} from '@vkara/shared-types';

type CaptionsCapablePlayer = YT.Player & {
    getOption: NonNullable<YT.Player['getOption']>;
    setOption: NonNullable<YT.Player['setOption']>;
};

/** Runtime guard — captions module APIs appear after `onApiChange`. */
export function isCaptionsCapablePlayer(player: YT.Player): player is CaptionsCapablePlayer {
    return typeof player.getOption === 'function' && typeof player.setOption === 'function';
}

export function normalizeYoutubeCaptionTrack(raw: YT.CaptionsTrackListItem): CaptionTrack | null {
    const languageCode = raw.languageCode?.trim();
    if (!languageCode) {
        return null;
    }

    const displayName =
        raw.displayName?.trim() || raw.languageName?.trim() || raw.name?.trim() || languageCode;

    return {
        languageCode,
        displayName,
        kind: raw.kind?.trim() || undefined,
    };
}

/** Reads per-video caption tracks from the embed (TV / laptop player only). */
export function listYoutubeCaptionTracks(player: YT.Player): CaptionTrack[] {
    if (!isCaptionsCapablePlayer(player)) {
        return [];
    }

    try {
        player.loadModule?.('captions');
        const raw = player.getOption('captions', 'tracklist');
        if (!Array.isArray(raw)) {
            return [];
        }

        const tracks: CaptionTrack[] = [];
        for (const item of raw) {
            const track = normalizeYoutubeCaptionTrack(item);
            if (track) {
                tracks.push(track);
            }
        }

        return tracks;
    } catch {
        return [];
    }
}

export type ApplyYoutubeCaptionsOptions = {
    enabled: boolean;
    languageCode: string;
    tracks?: readonly CaptionTrack[];
};

const CAPTION_TRACK_SYNC_DELAYS_MS = [0, 500, 1500, 3000] as const;

/** Poll tracklist after load — `onApiChange` cannot be passed via react-youtube opts. */
export function scheduleCaptionTrackSync(
    player: YT.Player,
    sync: (player: YT.Player) => void,
): () => void {
    const timeouts: number[] = [];

    for (const delayMs of CAPTION_TRACK_SYNC_DELAYS_MS) {
        timeouts.push(
            window.setTimeout(() => {
                sync(player);
            }, delayMs),
        );
    }

    return () => {
        for (const id of timeouts) {
            window.clearTimeout(id);
        }
    };
}

/** Toggle closed captions and apply language on an embedded YouTube player. */
export function applyYoutubeCaptions(
    player: YT.Player,
    { enabled, languageCode, tracks = [] }: ApplyYoutubeCaptionsOptions,
): void {
    if (!isCaptionsCapablePlayer(player)) {
        return;
    }

    try {
        if (!enabled) {
            player.setOption('captions', 'track', {});
            return;
        }

        player.loadModule?.('captions');

        const track = pickCaptionTrack(tracks, languageCode);
        if (track) {
            player.setOption('captions', 'track', track);
            return;
        }

        player.setOption('captions', 'track', { languageCode });
    } catch {
        // Player not ready for captions module yet.
    }
}
