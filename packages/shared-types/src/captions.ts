/** ISO-style codes commonly used by YouTube `setOption('captions', 'track', …)`. */
export const CAPTION_LANGUAGE_CODES = [
    'vi',
    'en',
    'ja',
    'ko',
    'zh-CN',
    'zh-TW',
    'th',
    'id',
    'fr',
    'es',
    'pt',
    'de',
    'ru',
] as const;

export type CaptionLanguageCode = (typeof CAPTION_LANGUAGE_CODES)[number];

export const DEFAULT_CAPTION_LANGUAGE: CaptionLanguageCode = 'vi';

const CAPTION_LANGUAGE_SET = new Set<string>(CAPTION_LANGUAGE_CODES);

export function isCaptionLanguageCode(value: string): value is CaptionLanguageCode {
    return CAPTION_LANGUAGE_SET.has(value);
}

/** Normalized caption track from the IFrame API `tracklist` (per video). */
export interface CaptionTrack {
    languageCode: string;
    displayName: string;
    /** e.g. `asr` for auto-generated captions */
    kind?: string;
}

export function pickCaptionTrack(
    tracks: readonly CaptionTrack[],
    preferredLanguage: string,
): CaptionTrack | null {
    if (tracks.length === 0) {
        return null;
    }

    const normalized = preferredLanguage.trim().toLowerCase();
    const exact = tracks.find((t) => t.languageCode.toLowerCase() === normalized);
    if (exact) {
        return exact;
    }

    const prefix = tracks.find((t) =>
        t.languageCode.toLowerCase().startsWith(normalized.split('-')[0] ?? normalized),
    );
    if (prefix) {
        return prefix;
    }

    return tracks[0] ?? null;
}
