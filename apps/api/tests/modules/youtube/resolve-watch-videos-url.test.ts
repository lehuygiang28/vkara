import { describe, expect, it } from 'vitest';

import { coercePlaylistFetchInput } from '@/modules/youtube/resolve-watch-videos-url';

const SAMPLE =
    'https://www.youtube.com/watch_videos?video_ids=Cfa2FTJG7CQ,9bZkp7q19f0,kJQP7kiw5Fk';
const LIST_URL =
    'https://www.youtube.com/watch?v=Cfa2FTJG7CQ&list=TLGGph6XLhEqeG8xNDExMjAyNg';

describe('coercePlaylistFetchInput', () => {
    it('follows a watch_videos redirect to the list URL', async () => {
        const resolved = await coercePlaylistFetchInput(SAMPLE, async () => {
            return new Response(null, {
                status: 303,
                headers: { location: LIST_URL },
            });
        });

        expect(resolved).toBe(LIST_URL);
    });

    it('rejects a redirect that has no list id', async () => {
        await expect(
            coercePlaylistFetchInput(SAMPLE, async () => {
                return new Response(null, {
                    status: 303,
                    headers: { location: 'https://www.youtube.com/watch?v=Cfa2FTJG7CQ' },
                });
            }),
        ).rejects.toThrow('Invalid playlist URL');
    });

    it('rejects a redirect onto another host without fetching it', async () => {
        const calls: string[] = [];
        await expect(
            coercePlaylistFetchInput(SAMPLE, async (url) => {
                calls.push(url);
                return new Response(null, {
                    status: 303,
                    headers: {
                        location: 'https://evil.example/watch?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
                    },
                });
            }),
        ).rejects.toThrow('Invalid playlist URL');
        expect(calls).toHaveLength(1);
        expect(calls[0]).toContain('https://www.youtube.com/watch_videos');
    });

    it('stops after four YouTube redirects that never include a list id', async () => {
        let hops = 0;
        await expect(
            coercePlaylistFetchInput(SAMPLE, async () => {
                hops += 1;
                return new Response(null, {
                    status: 302,
                    headers: { location: `https://www.youtube.com/redirect?hop=${hops}` },
                });
            }),
        ).rejects.toThrow('Invalid playlist URL');
        expect(hops).toBe(4);
    });

    it('leaves a normal playlist URL untouched', async () => {
        const playlist = 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';
        await expect(coercePlaylistFetchInput(playlist, async () => {
            throw new Error('fetch should not run');
        })).resolves.toBe(playlist);
    });
});
