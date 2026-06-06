'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '@/hooks/use-toast';
import type { SpeechRecognitionErrorCode } from '@/hooks/use-speech-recognition';
import { useVoiceSearch } from '@/hooks/use-voice-search';
import { useScopedI18n } from '@/locales/client';

type UseVoiceSearchSessionOptions = {
    locale: string;
    onSearchAction: (query: string) => void;
    onClearSuggestionsAction?: () => void;
    /** Stop capture when parent UI is busy (e.g. search in flight). */
    suspendWhen?: boolean;
};

export function useVoiceSearchSession({
    locale,
    onSearchAction,
    onClearSuggestionsAction,
    suspendWhen = false,
}: UseVoiceSearchSessionOptions) {
    const t = useScopedI18n('videoSearch');
    const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
    const [overlayTranscript, setOverlayTranscript] = useState('');

    const overlayTranscriptRef = useRef('');
    const useWhisperEngineRef = useRef(false);
    const searchCommittedRef = useRef(false);
    const manualStopPendingRef = useRef(false);
    const cancelPendingRef = useRef(false);

    const resetSessionFlags = useCallback(() => {
        searchCommittedRef.current = false;
        manualStopPendingRef.current = false;
        cancelPendingRef.current = false;
    }, []);

    const handleSpeechError = useCallback(
        (error: SpeechRecognitionErrorCode | string) => {
            resetSessionFlags();
            setVoiceOverlayOpen(false);
            setOverlayTranscript('');
            overlayTranscriptRef.current = '';

            let description = t('voiceError');
            if (error === 'not-allowed' || error === 'service-not-allowed') {
                description = t('voicePermissionDenied');
            } else if (error === 'no-speech') {
                description = t('voiceNoSpeech');
            } else if (error === 'network') {
                description = t('voiceNetworkError');
            }

            toast({ id: 'voice-search-error', title: description, variant: 'error' });
        },
        [resetSessionFlags, t],
    );

    const finishWithSearch = useCallback(
        (trimmed: string) => {
            if (searchCommittedRef.current || !trimmed) {
                return;
            }

            searchCommittedRef.current = true;
            manualStopPendingRef.current = false;
            onClearSuggestionsAction?.();
            setVoiceOverlayOpen(false);
            setOverlayTranscript('');
            overlayTranscriptRef.current = '';
            onSearchAction(trimmed);
        },
        [onClearSuggestionsAction, onSearchAction],
    );

    const handleSpeechTranscript = useCallback(
        (transcript: string, isFinal: boolean) => {
            const trimmed = transcript.trim();
            setOverlayTranscript(transcript);
            overlayTranscriptRef.current = transcript;

            if (useWhisperEngineRef.current) {
                if (!trimmed) {
                    return;
                }
                window.setTimeout(() => {
                    finishWithSearch(trimmed);
                }, 450);
                return;
            }

            if (isFinal && trimmed) {
                finishWithSearch(trimmed);
            }
        },
        [finishWithSearch],
    );

    const handleListeningEnd = useCallback(
        (transcript: string) => {
            if (useWhisperEngineRef.current) {
                return;
            }

            if (cancelPendingRef.current) {
                cancelPendingRef.current = false;
                resetSessionFlags();
                return;
            }

            if (searchCommittedRef.current) {
                resetSessionFlags();
                return;
            }

            const trimmed = transcript.trim() || overlayTranscriptRef.current.trim();
            if (manualStopPendingRef.current) {
                manualStopPendingRef.current = false;
                if (trimmed) {
                    finishWithSearch(trimmed);
                } else {
                    handleSpeechError('no-speech');
                }
                return;
            }

            if (trimmed) {
                finishWithSearch(trimmed);
                return;
            }

            handleSpeechError('no-speech');
        },
        [finishWithSearch, handleSpeechError, resetSessionFlags],
    );

    const {
        isVoiceSupported,
        isRecording,
        isProcessing,
        toggleListening,
        stopListening,
        useWhisperEngine,
    } = useVoiceSearch({
        locale,
        onTranscriptAction: handleSpeechTranscript,
        onListeningEndAction: handleListeningEnd,
        onErrorAction: handleSpeechError,
    });

    useEffect(() => {
        useWhisperEngineRef.current = useWhisperEngine;
    }, [useWhisperEngine]);

    useEffect(() => {
        overlayTranscriptRef.current = overlayTranscript;
    }, [overlayTranscript]);

    const closeVoiceOverlay = useCallback(() => {
        cancelPendingRef.current = true;
        setVoiceOverlayOpen(false);
        setOverlayTranscript('');
        overlayTranscriptRef.current = '';
        stopListening();
    }, [stopListening]);

    const startVoiceSession = useCallback(() => {
        resetSessionFlags();
        setOverlayTranscript('');
        overlayTranscriptRef.current = '';
        setVoiceOverlayOpen(true);
        if (!isRecording && !isProcessing) {
            toggleListening();
        }
    }, [isProcessing, isRecording, resetSessionFlags, toggleListening]);

    const handleVoiceMicPress = useCallback(() => {
        if (isProcessing) {
            return;
        }

        if (isRecording) {
            manualStopPendingRef.current = true;
            stopListening();
            return;
        }

        if (!voiceOverlayOpen) {
            startVoiceSession();
            return;
        }

        toggleListening();
    }, [
        isProcessing,
        isRecording,
        voiceOverlayOpen,
        startVoiceSession,
        stopListening,
        toggleListening,
    ]);

    useEffect(() => {
        if (!suspendWhen) {
            return;
        }

        cancelPendingRef.current = true;
        setVoiceOverlayOpen(false);
        setOverlayTranscript('');
        overlayTranscriptRef.current = '';
        stopListening();
    }, [stopListening, suspendWhen]);

    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return {
        isVoiceSupported,
        isRecording,
        isProcessing,
        voiceOverlayOpen,
        overlayTranscript,
        useWhisperEngine,
        startVoiceSession,
        closeVoiceOverlay,
        handleVoiceMicPress,
    };
}
