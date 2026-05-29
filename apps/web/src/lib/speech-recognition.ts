export function getSpeechRecognitionConstructor():
    | (new () => SpeechRecognition)
    | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function isWebSpeechRecognitionSupported(): boolean {
    return getSpeechRecognitionConstructor() !== undefined;
}

export function localeToSpeechLanguage(locale: string): string {
    switch (locale) {
        case 'vi':
            return 'vi';
        case 'en':
            return 'en';
        default:
            return 'en';
    }
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
