import { describe, expect, it } from 'vitest';

import { joinYoutubeiRequestUrl } from '@/modules/youtube/youtubei-native-fetch';

describe('joinYoutubeiRequestUrl', () => {
    it('normalizes youtubei request URLs without double slashes', () => {
        const url = joinYoutubeiRequestUrl('www.youtube.com', '/youtubei/v1/browse', {
            key: 'abc',
            prettyPrint: 'false',
        });

        expect(url).toBe('https://www.youtube.com/youtubei/v1/browse?key=abc&prettyPrint=false');
        expect(url).not.toContain('//youtubei');
    });
});
