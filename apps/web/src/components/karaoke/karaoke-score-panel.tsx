'use client';

import { Mic, MicOff, Star, StarOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useKaraokeScoring } from '@/hooks/use-karaoke-scoring';
import { useKaraokeStore } from '@/store/karaokeStore';
import { KaraokeResultOverlay } from '@/components/karaoke/karaoke-result-overlay';
import { useI18n } from '@/locales/client';

/** Shown when this device is NOT the designated scorer. */
function ScorerRoleGate({ onClaim }: { onClaim: () => void }) {
    const t = useI18n();
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/30 px-4 py-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Mic className="h-6 w-6 text-muted-foreground" aria-hidden />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-semibold">{t('karaoke.roleNotScorerTitle')}</p>
                <p className="text-xs text-muted-foreground">
                    {t('karaoke.roleNotScorerHint')}
                </p>
            </div>
            <Button type="button" variant="default" size="sm" className="gap-2" onClick={onClaim}>
                <Star className="h-4 w-4" />
                {t('karaoke.roleClaimButton')}
            </Button>
        </div>
    );
}

export function KaraokeScorePanel() {
    const t = useI18n();
    const isScorerDevice = useKaraokeStore((s) => s.isScorerDevice);
    const setIsScorerDevice = useKaraokeStore((s) => s.setIsScorerDevice);
    const dismissDurationSec = useKaraokeStore((s) => s.dismissDurationSec);

    const { isScoring, liveFrame, finalScore, error, start, stop, dismissScore } =
        useKaraokeScoring();

    if (!isScorerDevice) {
        return <ScorerRoleGate onClaim={() => setIsScorerDevice(true)} />;
    }

    const handleRelease = () => {
        if (isScoring) stop(false);
        setIsScorerDevice(false);
    };

    const statusText = finalScore
        ? t('karaoke.scoringContinues')
        : isScoring
        ? liveFrame.isVoiceDetected
            ? t('karaoke.statusVoiceDetected')
            : t('karaoke.statusWaiting')
        : t('karaoke.statusIdle');

    return (
        <>
            {finalScore ? (
                <KaraokeResultOverlay
                    score={finalScore}
                    onDismiss={dismissScore}
                    dismissDuration={dismissDurationSec * 1000}
                />
            ) : null}

            <div className="flex flex-col gap-3 rounded-xl bg-muted/30 p-4">
                {/* Role indicator */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Star
                            className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                            aria-hidden
                        />
                        <span className="text-xs font-semibold text-yellow-400">
                            {t('karaoke.roleScorerTitle')}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleRelease}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        aria-label={t('karaoke.roleReleaseButton')}
                    >
                        <StarOff className="h-3.5 w-3.5" />
                        {t('karaoke.roleReleaseButton')}
                    </button>
                </div>

                {/* Live status */}
                <div
                    className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                        isScoring ? 'bg-primary/10' : 'bg-muted/40',
                    )}
                >
                    <span
                        className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            isScoring && liveFrame.isVoiceDetected
                                ? 'animate-pulse bg-green-400'
                                : isScoring
                                  ? 'animate-pulse bg-yellow-400'
                                  : 'bg-muted-foreground/40',
                        )}
                    />
                    <span
                        className={cn(
                            'text-sm',
                            isScoring ? 'text-foreground' : 'text-muted-foreground',
                        )}
                    >
                        {statusText}
                    </span>
                </div>

                {/* Info */}
                {!isScoring && (
                    <p className="text-xs text-muted-foreground">
                        {t('karaoke.scoreWillShowAuto')}
                    </p>
                )}

                {/* Mic button */}
                <Button
                    type="button"
                    variant={isScoring ? 'destructive' : 'default'}
                    className="w-full gap-2"
                    onClick={isScoring ? () => stop(true) : () => void start()}
                >
                    {isScoring ? (
                        <MicOff className="h-4 w-4" />
                    ) : (
                        <Mic className="h-4 w-4" />
                    )}
                    {isScoring ? t('karaoke.stopButton') : t('karaoke.startButton')}
                </Button>

                {error ? (
                    <p className="text-xs text-destructive">
                        {error === 'mic_permission_denied'
                            ? t('karaoke.errorMicPermission')
                            : error}
                    </p>
                ) : null}
            </div>
        </>
    );
}

