'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechRecognitionErrorCode = globalThis.SpeechRecognitionErrorCode;

type UseSpeechRecognitionOptions = {
    lang: string;
    onTranscript: (transcript: string, isFinal: boolean) => void;
    onError?: (error: SpeechRecognitionErrorCode) => void;
};

function getSpeechRecognitionConstructor():
    | (new () => SpeechRecognition)
    | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

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
    onTranscript,
    onError,
}: UseSpeechRecognitionOptions) {
    const [isSupported, setIsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const onTranscriptRef = useRef(onTranscript);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
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
    }, [lang]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    const startListening = useCallback(() => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            return;
        }

        recognition.lang = lang;

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
        isSupported,
        isListening,
        startListening,
        stopListening,
        toggleListening,
    };
}

export function localeToSpeechRecognitionLang(locale: string): string {
    switch (locale) {
        case 'vi':
            return 'vi-VN';
        case 'en':
            return 'en-US';
        default:
            return 'en-US';
    }
}
