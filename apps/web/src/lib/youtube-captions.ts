/** Map app locale to YouTube captions track language (ISO 639-1). */
export function youtubeCaptionsLanguageCode(locale: string): string {
    if (locale.startsWith('vi')) {
        return 'vi';
    }
    return 'en';
}

/** Toggle closed captions on an embedded YouTube player. */
export function applyYoutubeCaptions(
    player: YT.Player,
    enabled: boolean,
    locale: string,
): void {
    if (typeof player.setOption !== 'function') {
        return;
    }

    try {
        if (enabled) {
            player.loadModule?.('captions');
            player.setOption('captions', 'track', {
                languageCode: youtubeCaptionsLanguageCode(locale),
            });
            return;
        }

        player.setOption('captions', 'track', {});
    } catch {
        // Player not ready for captions module yet.
    }
}
