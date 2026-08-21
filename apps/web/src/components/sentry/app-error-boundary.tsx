'use client';

import { type ReactNode, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/nextjs';

import { RecoveryShell } from '@/components/sentry/recovery-shell';
import { useErrorBoundaryRecovery } from '@/hooks/use-error-boundary-recovery';
import { documentRecoveryPhaseLabel } from '@/lib/recovery-phase-label';

type FallbackProps = {
    error: unknown;
    resetError: () => void;
};

function toRecoverableError(error: unknown): Error & { digest?: string } {
    if (error instanceof Error) {
        return error;
    }
    return new Error(typeof error === 'string' ? error : 'Unknown render error');
}

function AutoRecoverFallback({ error, resetError }: FallbackProps) {
    const recoverable = useMemo(() => toRecoverableError(error), [error]);
    const phase = useErrorBoundaryRecovery(recoverable, resetError, {
        boundaryTag: 'react_tree',
    });
    const shellPhase = phase === 'reporting' ? 'retrying' : phase;

    return (
        <RecoveryShell
            phase={shellPhase}
            label={documentRecoveryPhaseLabel(shellPhase)}
            className="flex min-h-[30vh] items-center justify-center px-6 py-10"
        />
    );
}

/**
 * Client-tree safety net under the locale layout.
 * Catches render errors that never reach `error.tsx`, reports to Sentry, auto-recovers.
 * Must not call next-intl: Intl.PluralRules is missing on Safari 12.
 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
    const renderFallback = useCallback(
        (props: FallbackProps) => <AutoRecoverFallback {...props} />,
        [],
    );

    return (
        <Sentry.ErrorBoundary fallback={renderFallback} showDialog={false}>
            {children}
        </Sentry.ErrorBoundary>
    );
}
