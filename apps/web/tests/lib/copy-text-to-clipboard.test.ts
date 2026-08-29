import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyTextToClipboard } from '@/lib/copy-text-to-clipboard';

describe('copyTextToClipboard', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('writes text with the Clipboard API', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });

        await expect(copyTextToClipboard('hello')).resolves.toBe(true);
        expect(writeText).toHaveBeenCalledWith('hello');
    });

    it('returns false when the Clipboard API is unavailable', async () => {
        vi.stubGlobal('navigator', { clipboard: undefined });
        await expect(copyTextToClipboard('hello')).resolves.toBe(false);
    });

    it('returns false when writeText rejects', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('denied'));
        vi.stubGlobal('navigator', { clipboard: { writeText } });

        await expect(copyTextToClipboard('hello')).resolves.toBe(false);
    });
});
