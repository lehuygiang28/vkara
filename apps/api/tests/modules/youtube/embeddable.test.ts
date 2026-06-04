import { describe, expect, it } from 'vitest';

import {
    EMBED_BLOCKED_PATTERNS,
    isEmbedBlockedInHtml,
    parseEmbedPlayabilityPreview,
} from '@/modules/youtube/embeddable';

describe('parseEmbedPlayabilityPreview', () => {
    it('parses escaped JSON from embed HTML', () => {
        const html = `previewPlayabilityStatus\\":{\\"status\\":\\"OK\\"}`;
        expect(parseEmbedPlayabilityPreview(html)).toEqual({ status: 'OK', reason: undefined });
    });

    it('parses ERROR with reason', () => {
        const html = `previewPlayabilityStatus\\":{\\"status\\":\\"ERROR\\",\\"reason\\":\\"This video is unavailable\\"}`;
        expect(parseEmbedPlayabilityPreview(html)?.status).toBe('ERROR');
        expect(parseEmbedPlayabilityPreview(html)?.reason).toBe('This video is unavailable');
    });
});

describe('isEmbedBlockedInHtml', () => {
    it('allows OK preview status without block phrases', () => {
        const html = 'previewPlayabilityStatus\\":{\\"status\\":\\"OK\\"}';
        expect(isEmbedBlockedInHtml(html)).toBe(false);
    });

    it('blocks owner-disabled embedding message', () => {
        const html =
            'previewPlayabilityStatus\\":{\\"status\\":\\"OK\\"} Playback on other websites has been disabled by the video owner';
        expect(isEmbedBlockedInHtml(html)).toBe(true);
        expect(EMBED_BLOCKED_PATTERNS.some((p) => p.test(html))).toBe(true);
    });

    it('blocks ERROR preview status', () => {
        const html = 'previewPlayabilityStatus\\":{\\"status\\":\\"ERROR\\",\\"reason\\":\\"x\\"}';
        expect(isEmbedBlockedInHtml(html)).toBe(true);
    });

    it('allows LIVE_STREAM preview status', () => {
        const html = 'previewPlayabilityStatus\\":{\\"status\\":\\"LIVE_STREAM\\"}';
        expect(isEmbedBlockedInHtml(html)).toBe(false);
    });

    it('blocks when preview marker is missing', () => {
        expect(isEmbedBlockedInHtml('<html></html>')).toBe(true);
    });

    it('blocks UNPLAYABLE preview status', () => {
        const html = 'previewPlayabilityStatus\\":{\\"status\\":\\"UNPLAYABLE\\"}';
        expect(isEmbedBlockedInHtml(html)).toBe(true);
    });

    it('returns null preview when marker absent', () => {
        expect(parseEmbedPlayabilityPreview('no data here')).toBeNull();
    });
});
