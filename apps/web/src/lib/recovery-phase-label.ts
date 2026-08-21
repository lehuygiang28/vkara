export type RecoveryPhase = 'reporting' | 'retrying' | 'redirecting';

const EN_LABELS: Record<RecoveryPhase, string> = {
    reporting: 'Reporting the issue…',
    retrying: 'Recovering automatically…',
    redirecting: 'Taking you back…',
};

const VI_LABELS: Record<RecoveryPhase, string> = {
    reporting: 'Đang ghi nhận lỗi…',
    retrying: 'Đang tự khôi phục…',
    redirecting: 'Đang đưa bạn về trang chính…',
};

/**
 * Sr-only recovery copy without next-intl / Intl.PluralRules.
 * Keep strings in sync with `error.boundary.*` in locales/en.ts and locales/vi.ts.
 */
export function recoveryPhaseLabel(phase: RecoveryPhase, lang?: string | null): string {
    return (lang === 'vi' ? VI_LABELS : EN_LABELS)[phase];
}

export function documentRecoveryPhaseLabel(phase: RecoveryPhase): string {
    const lang = typeof document !== 'undefined' ? document.documentElement.lang : undefined;
    return recoveryPhaseLabel(phase, lang);
}
