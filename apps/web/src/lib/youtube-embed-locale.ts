import type { AppLocale } from '@/lib/locale-path';

/** YouTube iframe `hl` values aligned with app locales. */
const YOUTUBE_EMBED_HL: Record<AppLocale, string> = {
    vi: 'vi_vn',
    en: 'en_us',
};

export function youtubeEmbedHl(locale: AppLocale): string {
    return YOUTUBE_EMBED_HL[locale];
}
