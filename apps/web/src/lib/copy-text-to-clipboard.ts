/**
 * Copy text while the user-gesture chain is still active (e.g. button click).
 * Prefetch async data before calling this so `writeText` runs in the same turn.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        return false;
    }

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
