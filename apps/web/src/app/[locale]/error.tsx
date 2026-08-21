'use client';

import { useErrorBoundaryRecovery } from '@/hooks/use-error-boundary-recovery';
import { RecoveryShell } from '@/components/sentry/recovery-shell';
import { documentRecoveryPhaseLabel } from '@/lib/recovery-phase-label';

/**
 * Segment error boundary — reports to Sentry, then auto-recovers silently.
 * Soft `reset()` first; if the segment keeps crashing, navigates home.
 * Must not call next-intl: Intl.PluralRules is missing on Safari 12.
 */
export default function LocaleError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const phase = useErrorBoundaryRecovery(error, reset);

    return <RecoveryShell phase={phase} label={documentRecoveryPhaseLabel(phase)} />;
}
