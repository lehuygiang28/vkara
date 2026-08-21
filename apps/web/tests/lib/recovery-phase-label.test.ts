import { describe, expect, it } from 'vitest';

import { recoveryPhaseLabel } from '@/lib/recovery-phase-label';

describe('recoveryPhaseLabel', () => {
    it('uses Vietnamese copy when lang is vi', () => {
        expect(recoveryPhaseLabel('retrying', 'vi')).toBe('Đang tự khôi phục…');
        expect(recoveryPhaseLabel('reporting', 'vi')).toBe('Đang ghi nhận lỗi…');
        expect(recoveryPhaseLabel('redirecting', 'vi')).toBe('Đang đưa bạn về trang chính…');
    });

    it('uses English copy when lang is en', () => {
        expect(recoveryPhaseLabel('retrying', 'en')).toBe('Recovering automatically…');
        expect(recoveryPhaseLabel('reporting', 'en')).toBe('Reporting the issue…');
        expect(recoveryPhaseLabel('redirecting', 'en')).toBe('Taking you back…');
    });

    it('falls back to English for missing or unknown lang', () => {
        expect(recoveryPhaseLabel('retrying', undefined)).toBe('Recovering automatically…');
        expect(recoveryPhaseLabel('retrying', '')).toBe('Recovering automatically…');
        expect(recoveryPhaseLabel('retrying', 'fr')).toBe('Recovering automatically…');
    });
});
