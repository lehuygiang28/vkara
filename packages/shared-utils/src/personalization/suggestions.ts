const normalizeSuggestion = (value: string): string => value.trim().toLowerCase();

/** Local search history first, then remote YouTube suggestions (deduped). */
export const blendSuggestions = (
    localQueries: string[],
    remoteSuggestions: string[],
    queryPrefix: string,
): string[] => {
    const prefix = normalizeSuggestion(queryPrefix);

    if (!prefix) {
        const seen = new Set<string>();
        const recents: string[] = [];

        for (const query of localQueries) {
            const trimmed = query.trim();
            const normalized = normalizeSuggestion(trimmed);
            if (!normalized || seen.has(normalized)) {
                continue;
            }
            seen.add(normalized);
            recents.push(trimmed);
        }

        return recents;
    }

    const seen = new Set<string>();
    const merged: string[] = [];

    const pushUnique = (suggestion: string) => {
        const normalized = normalizeSuggestion(suggestion);
        if (!normalized.startsWith(prefix) || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        merged.push(suggestion.trim());
    };

    for (const query of localQueries) {
        pushUnique(query);
    }

    for (const suggestion of remoteSuggestions) {
        pushUnique(suggestion);
    }

    return merged;
};
