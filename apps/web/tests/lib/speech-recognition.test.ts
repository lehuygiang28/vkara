import { describe, expect, it } from 'vitest';

import {
    isWebSpeechRecognitionSupported,
    localeToSpeechLanguage,
    localeToSpeechRecognitionLang,
} from '@/lib/speech-recognition';

describe('speech locale helpers', () => {
    it('maps known app locales', () => {
        expect(localeToSpeechLanguage('vi')).toBe('vi');
        expect(localeToSpeechLanguage('en')).toBe('en');
        expect(localeToSpeechRecognitionLang('vi')).toBe('vi-VN');
        expect(localeToSpeechRecognitionLang('en')).toBe('en-US');
    });

    it('defaults unknown locales to English', () => {
        expect(localeToSpeechLanguage('ja')).toBe('en');
        expect(localeToSpeechRecognitionLang('de')).toBe('en-US');
    });
});

describe('isWebSpeechRecognitionSupported', () => {
    it('is false in node test environment', () => {
        expect(isWebSpeechRecognitionSupported()).toBe(false);
    });
});
