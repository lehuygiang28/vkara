'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    getSpeechRecognitionConstructor,
    localeToSpeechRecognitionLang,
} from '@/lib/speech-recognition';

export type SpeechRecognitionErrorCode = globalThis.SpeechRecognitionErrorCode;

export { localeToSpeechRecognitionLang };

type UseSpeechRecognitionOptions = {
    lang: string;
    onTranscriptAction: (transcript: string, isFinal: boolean) => void;
    onListeningEndAction?: (transcript: string) => void;
    onErrorAction?: (error: SpeechRecognitionErrorCode) => void;
    enabled?: boolean;
};

function collectTranscript(results: SpeechRecognitionResultList): {
    transcript: string;
    isFinal: boolean;
} {
    let transcript = '';
    let isFinal = false;

    for (let index = 0; index < results.length; index += 1) {
        const result = results[index];
        transcript += result[0]?.transcript ?? '';
        if (result.isFinal) {
            isFinal = true;
        }
    }

    return { transcript: transcript.trim(), isFinal };
}

export function useSpeechRecognition({
    lang,
    onTranscriptAction: onTranscript,
    onListeningEndAction: onListeningEnd,
    onErrorAction: onError,
    enabled = true,
}: UseSpeechRecognitionOptions) {
    const [isSupported, setIsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const latestTranscriptRef = useRef('');
    const onTranscriptRef = useRef(onTranscript);
    const onListeningEndRef = useRef(onListeningEnd);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        onListeningEndRef.current = onListeningEnd;
    }, [onListeningEnd]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        if (!enabled) {
            setIsSupported(false);
            setIsListening(false);
            recognitionRef.current?.abort();
            recognitionRef.current = null;
            return;
        }

        const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
        if (!SpeechRecognitionCtor) {
            setIsSupported(false);
            return;
        }

        setIsSupported(true);
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = lang;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
            onListeningEndRef.current?.(latestTranscriptRef.current);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            setIsListening(false);
            if (event.error === 'aborted') {
                return;
            }
            onErrorRef.current?.(event.error);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const { transcript, isFinal } = collectTranscript(event.results);
            if (transcript) {
                latestTranscriptRef.current = transcript;
                onTranscriptRef.current(transcript, isFinal);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.onstart = null;
            recognition.onend = null;
            recognition.onerror = null;
            recognition.onresult = null;
            recognition.abort();
            recognitionRef.current = null;
        };
    }, [enabled, lang]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    const startListening = useCallback(() => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            return;
        }

        recognition.lang = lang;
        latestTranscriptRef.current = '';

        try {
            recognition.start();
        } catch {
            recognition.stop();
            try {
                recognition.start();
            } catch {
                onErrorRef.current?.('aborted');
            }
        }
    }, [lang]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
            return;
        }
        startListening();
    }, [isListening, startListening, stopListening]);

    return {
        isSupported: enabled && isSupported,
        isListening,
        startListening,
        stopListening,
        toggleListening,
    };
}
