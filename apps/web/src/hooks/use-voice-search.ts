'use client';

import { useMemo } from 'react';

import {
    isWebSpeechRecognitionSupported,
    localeToSpeechRecognitionLang,
} from '@/lib/speech-recognition';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import {
    useSpeechRecognition,
    type SpeechRecognitionErrorCode,
} from '@/hooks/use-speech-recognition';
import { useWhisperAvailable } from '@/hooks/use-whisper-available';
import { useWhisperRecording } from '@/hooks/use-whisper-recording';

type UseVoiceSearchOptions = {
    locale: string;
    onTranscriptAction: (transcript: string, isFinal: boolean) => void;
    onListeningEndAction?: (transcript: string) => void;
    onErrorAction?: (error: SpeechRecognitionErrorCode | string) => void;
};

export function useVoiceSearch({
    locale,
    onTranscriptAction: onTranscript,
    onListeningEndAction: onListeningEnd,
    onErrorAction: onError,
}: UseVoiceSearchOptions) {
    const useWhisperVoiceSearch = useAppSettingsStore((state) => state.useWhisperVoiceSearch);
    const { whisperAvailable } = useWhisperAvailable();

    const webSpeechSupported = isWebSpeechRecognitionSupported();
    const useWhisperEngine = whisperAvailable && (useWhisperVoiceSearch || !webSpeechSupported);

    const speechLang = localeToSpeechRecognitionLang(locale);

    const webSpeech = useSpeechRecognition({
        lang: speechLang,
        onTranscriptAction: onTranscript,
        onListeningEndAction: onListeningEnd,
        onErrorAction: onError,
        enabled: !useWhisperEngine,
    });

    const whisper = useWhisperRecording({
        locale,
        onTranscript: (text) => onTranscript(text, true),
        onError,
        enabled: useWhisperEngine,
    });

    const active = useWhisperEngine ? whisper : webSpeech;

    const voiceEngine = useMemo<'whisper' | 'webspeech' | 'none'>(() => {
        if (useWhisperEngine) {
            return 'whisper';
        }
        if (webSpeechSupported) {
            return 'webspeech';
        }
        return 'none';
    }, [useWhisperEngine, webSpeechSupported]);

    const isRecording = useWhisperEngine ? whisper.isRecording : webSpeech.isListening;
    const isProcessing = useWhisperEngine ? whisper.isProcessing : false;

    return {
        isVoiceSupported: webSpeechSupported || whisperAvailable,
        isRecording,
        isProcessing,
        isListening: isRecording || isProcessing,
        toggleListening: active.toggleListening,
        stopListening: active.stopListening,
        voiceEngine,
        whisperAvailable,
        webSpeechSupported,
        useWhisperEngine,
    };
}
