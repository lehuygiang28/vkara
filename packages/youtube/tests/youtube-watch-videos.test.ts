import { describe, expect, it } from 'vitest';

import { parseWatchVideosUrl } from '../src/youtube-watch-videos';

const SAMPLE =
    'https://www.youtube.com/watch_videos?video_ids=Cfa2FTJG7CQ,9bZkp7q19f0,kJQP7kiw5Fk';

describe('parseWatchVideosUrl', () => {
    it('keeps the order of a watch_videos URL', () => {
        expect(parseWatchVideosUrl(SAMPLE)).toEqual({
            kind: 'ok',
            videoIds: ['Cfa2FTJG7CQ', '9bZkp7q19f0', 'kJQP7kiw5Fk'],
        });
    });

    it('accepts an uppercase scheme', () => {
        expect(
            parseWatchVideosUrl('HTTPS://www.youtube.com/watch_videos?video_ids=Cfa2FTJG7CQ'),
        ).toEqual({ kind: 'ok', videoIds: ['Cfa2FTJG7CQ'] });
    });

    it('accepts youtube.com without www', () => {
        expect(
            parseWatchVideosUrl('https://youtube.com/watch_videos?video_ids=Cfa2FTJG7CQ'),
        ).toEqual({ kind: 'ok', videoIds: ['Cfa2FTJG7CQ'] });
    });

    it('rejects a space, a short token, and an empty video_ids', () => {
        expect(
            parseWatchVideosUrl(
                'https://www.youtube.com/watch_videos?video_ids=Cfa2FTJG7CQ, 9bZkp7q19f0',
            ).kind,
        ).toBe('invalid');
        expect(
            parseWatchVideosUrl('https://www.youtube.com/watch_videos?video_ids=Cfa2FTJG7CQ,short')
                .kind,
        ).toBe('invalid');
        expect(parseWatchVideosUrl('https://www.youtube.com/watch_videos?video_ids=').kind).toBe(
            'invalid',
        );
    });

    it('keeps the first 50 ids', () => {
        const ids = Array.from({ length: 60 }, (_, index) =>
            index % 2 === 0 ? 'Cfa2FTJG7CQ' : '9bZkp7q19f0',
        );
        const parsed = parseWatchVideosUrl(
            `https://www.youtube.com/watch_videos?video_ids=${ids.join(',')}`,
        );
        expect(parsed.kind).toBe('ok');
        if (parsed.kind === 'ok') {
            expect(parsed.videoIds).toHaveLength(50);
            expect(parsed.videoIds[0]).toBe('Cfa2FTJG7CQ');
            expect(parsed.videoIds[49]).toBe('9bZkp7q19f0');
        }
    });

    it('returns absent for a normal playlist URL', () => {
        expect(
            parseWatchVideosUrl('https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'),
        ).toEqual({ kind: 'absent' });
    });
});
