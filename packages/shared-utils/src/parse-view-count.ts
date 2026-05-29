const COMPACT_VIEW_PATTERN = /^([\d.]+)\s*([KMBT])$/i;

/**
 * Parse YouTube view count labels (e.g. "7.9M views", "1,234,567 views").
 * Unlike youtubei's stripToInt, preserves K/M/B multipliers.
 */
export function parseYoutubeViewCountText(text: string): number | null {
    let trimmed = text.trim();
    if (!trimmed || /^no views$/i.test(trimmed)) {
        return 0;
    }

    trimmed = trimmed.split('•')[0]?.trim() ?? trimmed;
    trimmed = trimmed
        .replace(/,/g, '')
        .replace(/\s*views?$/i, '')
        .trim();

    const compactMatch = COMPACT_VIEW_PATTERN.exec(trimmed);
    if (compactMatch) {
        const base = Number.parseFloat(compactMatch[1]);
        const unit = compactMatch[2].toUpperCase();
        const multipliers: Record<string, number> = {
            K: 1_000,
            M: 1_000_000,
            B: 1_000_000_000,
            T: 1_000_000_000_000,
        };
        const multiplier = multipliers[unit];
        if (Number.isFinite(base) && multiplier) {
            return Math.round(base * multiplier);
        }
    }

    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
        return null;
    }

    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? parsed : null;
}

export function coerceViewCount(raw: unknown): number {
    if (raw === null || raw === undefined) {
        return 0;
    }

    if (typeof raw === 'number') {
        return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    }

    if (typeof raw === 'string') {
        const fromText = parseYoutubeViewCountText(raw);
        if (fromText !== null) {
            return fromText;
        }
        const numeric = Number(raw.replace(/,/g, '').trim());
        return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
    }

    return 0;
}

/** Prefer parsed label text; fall back to numeric viewCount from youtubei. */
export function resolveViewCount(viewCount?: number | null, viewCountText?: string | null): number {
    if (viewCountText) {
        const fromText = parseYoutubeViewCountText(viewCountText);
        if (fromText !== null && fromText > 0) {
            return fromText;
        }
    }

    return coerceViewCount(viewCount);
}
