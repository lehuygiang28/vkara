import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (key: string) => map.get(key) ?? null,
        key: (index: number) => [...map.keys()][index] ?? null,
        removeItem: (key: string) => {
            map.delete(key);
        },
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
    });
});

const { send, getRelatedVideos, checkEmbeddableStatus } = vi.hoisted(() => ({
    send: vi.fn(),
    getRelatedVideos: vi.fn(),
    checkEmbeddableStatus: vi.fn(),
}));

vi.mock('@/lib/ensure-ws-send', () => ({
    ensureConnectedAndSend: send,
}));

vi.mock('@/services/youtube-api', () => ({
    getRelatedVideos,
    checkEmbeddableStatus,
}));

import { publishRelatedCandidate } from '@/hooks/use-publish-auto-play-candidate';

const related = {
    id: 'related',
    title: 'Related',
    duration: 60,
    duration_formatted: '1:00',
    type: 'video' as const,
    url: 'https://www.youtube.com/watch?v=related',
    uploadedAt: '',
    views: 0,
    channels: [{ name: 'Channel', verified: false }],
    thumbnails: [{ url: 'https://example.com/related.jpg', width: 120, height: 90 }],
};

describe('publishRelatedCandidate', () => {
    afterEach(() => {
        send.mockReset();
        getRelatedVideos.mockReset();
        checkEmbeddableStatus.mockReset();
    });

    it('retries the embed check after the attempt times out and does not publish the aborted attempt', async () => {
        getRelatedVideos.mockResolvedValue({ items: [related], continuation: null });
        checkEmbeddableStatus
            .mockImplementationOnce((_ids: string[], signal?: AbortSignal) => {
                return new Promise((_resolve, reject) => {
                    signal?.addEventListener('abort', () => {
                        reject(new DOMException('The operation was aborted.', 'AbortError'));
                    });
                });
            })
            .mockResolvedValueOnce([{ videoId: 'related', canEmbed: true }]);

        await publishRelatedCandidate('now', new AbortController().signal, 20);

        expect(checkEmbeddableStatus).toHaveBeenCalledTimes(2);
        expect(checkEmbeddableStatus.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith({
            type: 'setAutoPlayCandidate',
            video: expect.objectContaining({ id: 'related' }),
            forVideoId: 'now',
        });
    });

    it('does not publish when the caller cancels during the embed check', async () => {
        const parent = new AbortController();
        getRelatedVideos.mockResolvedValue({ items: [related], continuation: null });
        checkEmbeddableStatus.mockImplementation((_ids: string[], signal?: AbortSignal) => {
            return new Promise((_resolve, reject) => {
                parent.abort();
                if (!signal) {
                    return;
                }
                if (signal.aborted) {
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                    return;
                }
                signal.addEventListener('abort', () => {
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                });
            });
        });

        await publishRelatedCandidate('now', parent.signal, 5_000);

        expect(send).not.toHaveBeenCalled();
        expect(checkEmbeddableStatus).toHaveBeenCalledTimes(1);
    });
});
