import { describe, expect, it } from 'vitest';

import { consumeCommandOnce } from '@/lib/url-command-consume';

describe('consumeCommandOnce', () => {
    it('refuses consume when there is no browser storage', () => {
        expect(typeof window).toBe('undefined');
        expect(consumeCommandOnce('abcdefgh')).toBe(false);
    });
});
