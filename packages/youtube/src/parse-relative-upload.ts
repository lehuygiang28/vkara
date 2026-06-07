export type RelativeUploadUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export type ParsedRelativeUpload =
    | { kind: 'relative'; value: number; unit: RelativeUploadUnit }
    | { kind: 'justNow' };

const UNIT_ALIASES: Record<string, RelativeUploadUnit> = {
    second: 'second',
    seconds: 'second',
    sec: 'second',
    secs: 'second',
    minute: 'minute',
    minutes: 'minute',
    min: 'minute',
    mins: 'minute',
    hour: 'hour',
    hours: 'hour',
    hr: 'hour',
    hrs: 'hour',
    day: 'day',
    days: 'day',
    week: 'week',
    weeks: 'week',
    wk: 'week',
    wks: 'week',
    month: 'month',
    months: 'month',
    mo: 'month',
    mos: 'month',
    year: 'year',
    years: 'year',
    yr: 'year',
    yrs: 'year',
};

const JUST_NOW_PATTERN = /^(?:just\s+now|a\s+moment\s+ago)$/i;

/** Matches YouTube-style strings: "11 months ago", "Streamed 2 days ago", "1 year ago". */
const RELATIVE_PATTERN = /^(?:(?:streamed|premiered)\s+)?(?:(\d+)|(a|an))\s+([a-z]+)\s+ago$/i;

/**
 * Parse English relative upload labels from YouTube / youtubei.
 * Returns null when the value is not recognized (caller should show the raw string).
 */
export function parseYoutubeRelativeUpload(text: string): ParsedRelativeUpload | null {
    const trimmed = text.trim();
    if (!trimmed) {
        return null;
    }

    if (JUST_NOW_PATTERN.test(trimmed)) {
        return { kind: 'justNow' };
    }

    const match = RELATIVE_PATTERN.exec(trimmed);
    if (!match) {
        return null;
    }

    const quantityToken = match[1] ?? match[2];
    const unitToken = match[3]?.toLowerCase();
    if (!unitToken) {
        return null;
    }

    const unit = UNIT_ALIASES[unitToken];
    if (!unit) {
        return null;
    }

    const value =
        quantityToken === 'a' || quantityToken === 'an' ? 1 : Number.parseInt(quantityToken, 10);

    if (!Number.isFinite(value) || value < 0) {
        return null;
    }

    return { kind: 'relative', value, unit };
}
