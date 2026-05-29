'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { localeToSpeechLanguage } from '@/lib/speech-recognition';

const MAX_RECORDING_MS = 15_000;

type UseWhisperRecordingOptions = {
    locale: string;
    onTranscript: (transcript: string) => void;
    onError?: (message: string) => void;
    enabled?: boolean;
};

function pickMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') {
        return undefined;
    }

    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useWhisperRecording({
    locale,
    onTranscript,
    onError,
    enabled = true,
}: UseWhisperRecordingOptions) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onTranscriptRef = useRef(onTranscript);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const releaseStream = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
    }, []);

    const clearStopTimer = useCallback(() => {
        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
        }
    }, []);

    const transcribeBlob = useCallback(
        async (blob: Blob) => {
            setIsProcessing(true);
            try {
                const formData = new FormData();
                const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
                formData.append('file', blob, `recording.${extension}`);
                formData.append('language', localeToSpeechLanguage(locale));

                const response = await fetch('/api/speech/transcribe', {
                    method: 'POST',
                    body: formData,
                });

                const payload = (await response.json()) as { text?: string; error?: string };
                if (!response.ok) {
                    onErrorRef.current?.(payload.error ?? 'Transcription failed');
                    return;
                }

                const text = payload.text?.trim();
                if (text) {
                    onTranscriptRef.current(text);
                } else {
                    onErrorRef.current?.('no-speech');
                }
            } catch {
                onErrorRef.current?.('network');
            } finally {
                setIsProcessing(false);
            }
        },
        [locale],
    );

    const stopListening = useCallback(() => {
        clearStopTimer();
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
            setIsListening(false);
            releaseStream();
            return;
        }
        recorder.stop();
    }, [clearStopTimer, releaseStream]);

    const startListening = useCallback(async () => {
        if (!enabled || isListening || isProcessing) {
            return;
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            onErrorRef.current?.('not-allowed');
            return;
        }

        chunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const mimeType = pickMimeType();
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onerror = () => {
                setIsListening(false);
                releaseStream();
                onErrorRef.current?.('audio-capture');
            };

            recorder.onstop = () => {
                setIsListening(false);
                releaseStream();
                mediaRecorderRef.current = null;

                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || mimeType || 'audio/webm',
                });
                chunksRef.current = [];

                if (blob.size === 0) {
                    onErrorRef.current?.('no-speech');
                    return;
                }

                void transcribeBlob(blob);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsListening(true);

            stopTimerRef.current = setTimeout(() => {
                stopListening();
            }, MAX_RECORDING_MS);
        } catch {
            releaseStream();
            onErrorRef.current?.('not-allowed');
        }
    }, [enabled, isListening, isProcessing, releaseStream, stopListening, transcribeBlob]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
            return;
        }
        void startListening();
    }, [isListening, startListening, stopListening]);

    useEffect(() => {
        return () => {
            clearStopTimer();
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            releaseStream();
        };
    }, [clearStopTimer, releaseStream]);

    return {
        isListening: isListening || isProcessing,
        isProcessing,
        toggleListening,
        stopListening,
    };
}
