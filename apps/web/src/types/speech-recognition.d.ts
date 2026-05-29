export {};

declare global {
    interface SpeechRecognitionAlternative {
        readonly transcript: string;
        readonly confidence: number;
    }

    interface SpeechRecognitionResult {
        readonly isFinal: boolean;
        readonly length: number;
        item(index: number): SpeechRecognitionAlternative;
        [index: number]: SpeechRecognitionAlternative;
    }

    interface SpeechRecognitionResultList {
        readonly length: number;
        item(index: number): SpeechRecognitionResult;
        [index: number]: SpeechRecognitionResult;
    }

    interface SpeechRecognitionEvent extends Event {
        readonly resultIndex: number;
        readonly results: SpeechRecognitionResultList;
    }

    interface SpeechRecognitionErrorEvent extends Event {
        readonly error: SpeechRecognitionErrorCode;
        readonly message: string;
    }

    type SpeechRecognitionErrorCode =
        | 'no-speech'
        | 'aborted'
        | 'audio-capture'
        | 'network'
        | 'not-allowed'
        | 'service-not-allowed'
        | 'bad-grammar'
        | 'language-not-supported'
        | string;

    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        maxAlternatives: number;
        onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
        onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
        onend: ((this: SpeechRecognition, ev: Event) => void) | null;
        onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
        onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
        onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
        onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
        onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
        onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
        onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
        onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
        abort(): void;
        start(): void;
        stop(): void;
    }

    interface Window {
        SpeechRecognition?: {
            prototype: SpeechRecognition;
            new (): SpeechRecognition;
        };
        webkitSpeechRecognition?: {
            prototype: SpeechRecognition;
            new (): SpeechRecognition;
        };
    }
}
