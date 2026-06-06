'use client';

import { useEffect } from 'react';
import * as ReactDOM from 'react-dom';
import { Loader2, Mic, Square, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useOverlayPortal } from '@/components/pages/youtube/remote-panel-overlay-root';
import { useScopedI18n } from '@/locales/client';

export type VoiceSearchOverlayProps = {
    open: boolean;
    isRecording: boolean;
    isProcessing: boolean;
    liveTranscript: string;
    useWhisperEngine: boolean;
    onCloseAction: () => void;
    onMicPressAction: () => void;
};

export function VoiceSearchOverlay({
    open,
    isRecording,
    isProcessing,
    liveTranscript,
    useWhisperEngine,
    onCloseAction: onClose,
    onMicPressAction: onMicPress,
}: VoiceSearchOverlayProps) {
    const t = useScopedI18n('videoSearch');
    const { portalTarget, positionClass } = useOverlayPortal(open);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    if (!open || typeof document === 'undefined' || !portalTarget) {
        return null;
    }

    const trimmedTranscript = liveTranscript.trim();
    const hasLiveText = trimmedTranscript.length > 0;
    const showPulse = isRecording && !isProcessing && !hasLiveText;

    const headline = (() => {
        if (isProcessing) {
            return hasLiveText && useWhisperEngine ? trimmedTranscript : t('voiceProcessing');
        }
        if (hasLiveText) {
            return liveTranscript;
        }
        if (isRecording) {
            return t('voiceListening');
        }
        return t('voiceSpeakNow');
    })();

    const statusHint = (() => {
        if (isProcessing) {
            return null;
        }
        if (isRecording) {
            return t('voiceTapToStopAndSearch');
        }
        if (!hasLiveText) {
            return (
                <>
                    {t('voiceTrySaying')}{' '}
                    <span className="italic text-foreground/80">{t('voiceExampleQuery')}</span>
                </>
            );
        }
        return null;
    })();

    const micAriaLabel = (() => {
        if (isProcessing) {
            return t('voiceProcessing');
        }
        if (isRecording) {
            return t('voiceStopAndSearch');
        }
        return t('voiceStartRecording');
    })();

    return ReactDOM.createPortal(
        <div
            className={cn(
                positionClass,
                'inset-0 z-[200] flex flex-col bg-background text-foreground',
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-search-headline"
        >
            <header className="flex shrink-0 items-start px-3 pt-safe-offset">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('voiceClose')}
                >
                    <X className="h-7 w-7" strokeWidth={1.75} />
                </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-2 sm:px-10">
                <h1
                    id="voice-search-headline"
                    className={cn(
                        'max-w-2xl whitespace-pre-wrap break-words text-[1.625rem] font-normal leading-snug tracking-tight sm:text-[2rem]',
                        isProcessing && !hasLiveText && 'text-muted-foreground',
                    )}
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {headline}
                </h1>
                {useWhisperEngine && isRecording && !isProcessing && !hasLiveText ? (
                    <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                        {t('voiceWhisperListening')}
                    </p>
                ) : null}
            </div>

            <footer className="flex shrink-0 flex-col items-center px-5 pb-safe-offset-lg pt-4 sm:px-6">
                <div className="relative flex h-[min(38dvh,260px)] w-full max-w-sm flex-col items-center justify-end">
                    {statusHint ? (
                        <p className="mb-8 max-w-[18rem] text-center text-sm leading-relaxed text-muted-foreground">
                            {statusHint}
                        </p>
                    ) : (
                        <div className="mb-8 h-10" aria-hidden />
                    )}

                    <div className="relative flex h-[6.75rem] w-[6.75rem] items-center justify-center sm:h-[7.5rem] sm:w-[7.5rem]">
                        {showPulse ? (
                            <>
                                <span
                                    className="voice-ring-pulse absolute inset-0 rounded-full bg-destructive/20 dark:bg-destructive/25"
                                    aria-hidden
                                />
                                <span
                                    className="voice-ring-pulse voice-ring-pulse-delay-1 absolute inset-0 rounded-full bg-destructive/15 dark:bg-destructive/20"
                                    aria-hidden
                                />
                                <span
                                    className="voice-ring-pulse voice-ring-pulse-delay-2 absolute inset-2 rounded-full bg-destructive/10"
                                    aria-hidden
                                />
                            </>
                        ) : null}

                        <span
                            className="absolute inset-[-1.5rem] rounded-full border border-border/60"
                            aria-hidden
                        />

                        <button
                            type="button"
                            onClick={onMicPress}
                            disabled={isProcessing}
                            aria-pressed={isRecording}
                            className={cn(
                                'relative z-10 flex h-[4rem] w-[4rem] items-center justify-center rounded-full transition-transform sm:h-[4.5rem] sm:w-[4.5rem]',
                                'hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                isProcessing && 'pointer-events-none opacity-90',
                                isRecording
                                    ? 'bg-destructive text-destructive-foreground shadow-[0_4px_24px_hsl(var(--destructive)/0.35)]'
                                    : 'border-2 border-border bg-muted text-foreground shadow-sm',
                            )}
                            aria-label={micAriaLabel}
                        >
                            {isProcessing ? (
                                <Loader2
                                    className="h-8 w-8 animate-spin sm:h-9 sm:w-9"
                                    strokeWidth={2}
                                />
                            ) : isRecording ? (
                                <Square
                                    className="h-7 w-7 fill-current sm:h-8 sm:w-8"
                                    strokeWidth={0}
                                />
                            ) : (
                                <Mic className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2} />
                            )}
                        </button>
                    </div>
                </div>
            </footer>
        </div>,
        portalTarget,
    );
}
