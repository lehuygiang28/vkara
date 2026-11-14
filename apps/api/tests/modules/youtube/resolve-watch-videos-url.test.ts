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

    it('leaves a normal playlist URL untouched', async () => {
        const playlist = 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';
        await expect(coercePlaylistFetchInput(playlist, async () => {
            throw new Error('fetch should not run');
        })).resolves.toBe(playlist);
    });
});
