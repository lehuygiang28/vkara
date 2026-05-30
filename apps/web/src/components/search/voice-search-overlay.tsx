'use client';

import { useEffect } from 'react';
import * as ReactDOM from 'react-dom';
import { Loader2, Mic, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';

export type VoiceSearchOverlayProps = {
    open: boolean;
    isListening: boolean;
    isProcessing: boolean;
    liveTranscript: string;
    useWhisperEngine: boolean;
    onCloseAction: () => void;
    onMicPressAction: () => void;
};

export function VoiceSearchOverlay({
    open,
    isListening,
    isProcessing,
    liveTranscript,
    useWhisperEngine,
    onCloseAction: onClose,
    onMicPressAction: onMicPress,
}: VoiceSearchOverlayProps) {
    const t = useScopedI18n('videoSearch');

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    const trimmedTranscript = liveTranscript.trim();
    const hasLiveText = trimmedTranscript.length > 0;
    const showPulse = isListening && !isProcessing && !hasLiveText;

    const headline = (() => {
        if (isProcessing) {
            return hasLiveText && useWhisperEngine ? trimmedTranscript : t('voiceProcessing');
        }
        if (hasLiveText) {
            return liveTranscript;
        }
        return t('voiceSpeakNow');
    })();

    const showHint = !hasLiveText && !isProcessing;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[200] flex flex-col bg-[#0f0f0f] text-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-search-headline"
        >
            <header className="flex shrink-0 items-start px-3 pt-safe-offset">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    aria-label={t('voiceClose')}
                >
                    <X className="h-7 w-7" strokeWidth={1.75} />
                </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-2 sm:px-10">
                <h1
                    id="voice-search-headline"
                    className={cn(
                        'max-w-2xl whitespace-pre-wrap break-words text-[1.75rem] font-normal leading-snug tracking-tight sm:text-[2rem]',
                        hasLiveText && !isProcessing && 'text-white',
                        !hasLiveText && !isProcessing && 'text-white',
                        isProcessing && !hasLiveText && 'text-white/80',
                        isProcessing && hasLiveText && 'text-white',
                    )}
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {headline}
                </h1>
                {useWhisperEngine && isListening && !isProcessing && !hasLiveText ? (
                    <p className="mt-3 max-w-xl text-sm text-[#888888]">
                        {t('voiceWhisperListening')}
                    </p>
                ) : null}
            </div>

            <footer className="flex shrink-0 flex-col items-center px-6 pb-safe-offset-lg pt-6">
                <div className="relative flex h-[min(42dvh,280px)] w-full max-w-sm flex-col items-center justify-end">
                    {showHint ? (
                        <p className="mb-10 max-w-[17rem] text-center text-sm leading-relaxed text-[#aaaaaa]">
                            {t('voiceTrySaying')}{' '}
                            <span className="italic text-[#cccccc]">{t('voiceExampleQuery')}</span>
                        </p>
                    ) : (
                        <div className="mb-10 h-10" aria-hidden />
                    )}

                    <div className="relative flex h-[7.5rem] w-[7.5rem] items-center justify-center">
                        {showPulse ? (
                            <>
                                <span
                                    className="voice-ring-pulse absolute inset-0 rounded-full bg-white/10"
                                    aria-hidden
                                />
                                <span
                                    className="voice-ring-pulse voice-ring-pulse-delay-1 absolute inset-0 rounded-full bg-white/10"
                                    aria-hidden
                                />
                                <span
                                    className="voice-ring-pulse voice-ring-pulse-delay-2 absolute inset-2 rounded-full bg-white/[0.07]"
                                    aria-hidden
                                />
                            </>
                        ) : null}

                        <span
                            className="absolute inset-[-1.75rem] rounded-full border border-white/[0.08]"
                            aria-hidden
                        />

                        <button
                            type="button"
                            onClick={onMicPress}
                            disabled={isProcessing}
                            className={cn(
                                'relative z-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[#ff0000] shadow-[0_4px_24px_rgba(255,0,0,0.35)] transition-transform',
                                'hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]',
                                isProcessing && 'pointer-events-none opacity-90',
                            )}
                            aria-label={
                                isProcessing
                                    ? t('voiceProcessing')
                                    : isListening
                                      ? useWhisperEngine
                                          ? t('voiceTapToStop')
                                          : t('voiceStop')
                                      : t('voiceSearch')
                            }
                        >
                            {isProcessing ? (
                                <Loader2
                                    className="h-9 w-9 animate-spin text-white"
                                    strokeWidth={2}
                                />
                            ) : (
                                <Mic className="h-9 w-9 text-white" strokeWidth={2} />
                            )}
                        </button>
                    </div>

                    {useWhisperEngine && isListening && !isProcessing ? (
                        <p className="mt-6 text-center text-xs text-[#888888]">
                            {t('voiceTapToStop')}
                        </p>
                    ) : null}
                </div>
            </footer>
        </div>,
        document.body,
    );
}
