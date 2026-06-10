import { describe, expect, it, vi } from 'vitest';

import {
    getYoutubeOutboundTlsInit,
    isTransientYoutubeFetchError,
    youtubeOutboundFetch,
} from '@/modules/youtube/youtube-outbound-fetch';

describe('isTransientYoutubeFetchError', () => {
    it('detects Bun TLS verification errors', () => {
        const error = new Error('unknown certificate verification error');
        (error as NodeJS.ErrnoException).code = 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR';
        expect(isTransientYoutubeFetchError(error)).toBe(true);
    });

    it('detects stale socket messages without errno code', () => {
        expect(
            isTransientYoutubeFetchError(
                new Error(
                    'The socket connection was closed unexpectedly. For more information, pass `verbose: true`',
                ),
            ),
        ).toBe(true);
    });

    it('ignores non-network application errors', () => {
        expect(isTransientYoutubeFetchError(new Error('playlist not found'))).toBe(false);
    });
});

describe('getYoutubeOutboundTlsInit', () => {
    it('disables certificate verification when VKARA_TLS_INSECURE is enabled', () => {
        const previous = process.env.VKARA_TLS_INSECURE;
        process.env.VKARA_TLS_INSECURE = 'true';
        expect(getYoutubeOutboundTlsInit()).toEqual({ tls: { rejectUnauthorized: false } });
        process.env.VKARA_TLS_INSECURE = previous;
    });
});

describe('youtubeOutboundFetch', () => {
    it('retries transient failures with keepalive disabled', async () => {
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(
                Object.assign(new Error('unknown certificate verification error'), {
                    code: 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR',
                }),
            )
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));

        vi.stubGlobal('fetch', fetchMock);

        const response = await youtubeOutboundFetch('https://www.youtube.com/youtubei/v1/search');
        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ keepalive: false });

        vi.unstubAllGlobals();
    });
});
