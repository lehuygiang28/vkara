import { describe, expect, it } from 'vitest';
import {
    isTvBackKey,
    isTvExitKey,
    isTvMediaActionKey,
    isTvNavigationKey,
    isTvRevealKey,
    resolveTvRemoteKey,
} from '@/lib/tv-spatial-nav';

function fakeKeyEvent(partial: {
    key?: string;
    keyCode?: number;
    which?: number;
}): Pick<KeyboardEvent, 'key'> & { keyCode?: number; which?: number } {
    return {
        key: partial.key ?? '',
        keyCode: partial.keyCode,
        which: partial.which,
    };
}

describe('resolveTvRemoteKey', () => {
    it('maps Tizen Back keyCode 10009 even when key is Unidentified', () => {
        expect(
            resolveTvRemoteKey(fakeKeyEvent({ key: 'Unidentified', keyCode: 10009 })),
        ).toBe('Back');
    });

    it('prefers keyCode over a conflicting key string', () => {
        expect(resolveTvRemoteKey(fakeKeyEvent({ key: 'Escape', keyCode: 10009 }))).toBe('Back');
    });

    it('falls back to event.key for desktop Escape', () => {
        expect(resolveTvRemoteKey(fakeKeyEvent({ key: 'Escape', keyCode: 27 }))).toBe('Escape');
    });

    it('maps media keyCodes to canonical names', () => {
        expect(
            resolveTvRemoteKey(fakeKeyEvent({ key: 'Unidentified', keyCode: 10252 })),
        ).toBe('MediaPlayPause');
        expect(resolveTvRemoteKey(fakeKeyEvent({ keyCode: 415 }))).toBe('MediaPlay');
        expect(resolveTvRemoteKey(fakeKeyEvent({ keyCode: 19 }))).toBe('MediaPause');
        expect(resolveTvRemoteKey(fakeKeyEvent({ keyCode: 413 }))).toBe('MediaStop');
        expect(resolveTvRemoteKey(fakeKeyEvent({ keyCode: 10233 }))).toBe('MediaTrackNext');
        expect(resolveTvRemoteKey(fakeKeyEvent({ keyCode: 10232 }))).toBe('MediaTrackPrevious');
        expect(resolveTvRemoteKey(fakeKeyEvent({ keyCode: 412 }))).toBe('MediaRewind');
        expect(resolveTvRemoteKey(fakeKeyEvent({ keyCode: 417 }))).toBe('MediaFastForward');
    });

    it('maps Exit long-press keyCode', () => {
        expect(resolveTvRemoteKey(fakeKeyEvent({ key: 'Unidentified', keyCode: 10182 }))).toBe(
            'Exit',
        );
    });

    it('passes through unknown keys', () => {
        expect(resolveTvRemoteKey(fakeKeyEvent({ key: 'a', keyCode: 65 }))).toBe('a');
    });
});

describe('isTvBackKey / isTvExitKey', () => {
    it('recognizes Back via keyCode 10009', () => {
        expect(isTvBackKey(fakeKeyEvent({ key: 'Unidentified', keyCode: 10009 }))).toBe(true);
    });

    it('still recognizes Escape / Backspace / BrowserBack by name', () => {
        expect(isTvBackKey(fakeKeyEvent({ key: 'Escape' }))).toBe(true);
        expect(isTvBackKey(fakeKeyEvent({ key: 'Backspace' }))).toBe(true);
        expect(isTvBackKey(fakeKeyEvent({ key: 'BrowserBack' }))).toBe(true);
        expect(isTvBackKey('Back')).toBe(true);
    });

    it('treats Exit as exit, not back', () => {
        const exitEvt = fakeKeyEvent({ key: 'Unidentified', keyCode: 10182 });
        expect(isTvExitKey(exitEvt)).toBe(true);
        expect(isTvBackKey(exitEvt)).toBe(false);
    });
});

describe('isTvMediaActionKey / isTvRevealKey / isTvNavigationKey', () => {
    it('recognizes media actions via keyCode', () => {
        expect(isTvMediaActionKey(fakeKeyEvent({ keyCode: 10252 }))).toBe(true);
        expect(isTvMediaActionKey(fakeKeyEvent({ keyCode: 412 }))).toBe(true);
        expect(isTvRevealKey(fakeKeyEvent({ keyCode: 10252 }))).toBe(true);
    });

    it('recognizes D-pad via keyCode', () => {
        expect(isTvNavigationKey(fakeKeyEvent({ key: 'Unidentified', keyCode: 37 }))).toBe(true);
        expect(isTvNavigationKey(fakeKeyEvent({ keyCode: 13 }))).toBe(true);
    });

    it('does not treat letter keys as TV media/back', () => {
        expect(isTvMediaActionKey(fakeKeyEvent({ key: 'm', keyCode: 77 }))).toBe(false);
        expect(isTvBackKey(fakeKeyEvent({ key: 'm', keyCode: 77 }))).toBe(false);
    });
});
