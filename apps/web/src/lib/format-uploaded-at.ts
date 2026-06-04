import { parseYoutubeRelativeUpload, type RelativeUploadUnit } from '@vkara/youtube';

import type { useI18n } from '@/locales/client';

type RelativeTimeTranslator = ReturnType<typeof useI18n>;

function formatRelativeUnit(
    t: RelativeTimeTranslator,
    value: number,
    unit: RelativeUploadUnit,
): string {
    if (value === 1) {
        const singular = {
            second: () => t('relativeTime.secondAgo'),
            minute: () => t('relativeTime.minuteAgo'),
            hour: () => t('relativeTime.hourAgo'),
            day: () => t('relativeTime.dayAgo'),
            week: () => t('relativeTime.weekAgo'),
            month: () => t('relativeTime.monthAgo'),
            year: () => t('relativeTime.yearAgo'),
        } satisfies Record<RelativeUploadUnit, () => string>;
        return singular[unit]();
    }

    const plural = {
        second: () => t('relativeTime.secondsAgo', { count: value }),
        minute: () => t('relativeTime.minutesAgo', { count: value }),
        hour: () => t('relativeTime.hoursAgo', { count: value }),
        day: () => t('relativeTime.daysAgo', { count: value }),
        week: () => t('relativeTime.weeksAgo', { count: value }),
        month: () => t('relativeTime.monthsAgo', { count: value }),
        year: () => t('relativeTime.yearsAgo', { count: value }),
    } satisfies Record<RelativeUploadUnit, () => string>;
    return plural[unit]();
}

/**
 * Localize YouTube relative upload strings (English) via i18n; fallback to raw on parse failure.
 */
export function formatUploadedAt(raw: string, t: RelativeTimeTranslator): string {
    const parsed = parseYoutubeRelativeUpload(raw);
    if (!parsed) {
        return raw;
    }

    if (parsed.kind === 'justNow') {
        return t('relativeTime.justNow');
    }

    return formatRelativeUnit(t, parsed.value, parsed.unit);
}
