import { describe, expect, it } from 'vitest';

import { youtubeEmbedHl } from '@/lib/youtube-embed-locale';

describe('youtubeEmbedHl', () => {
    it('maps app locales to YouTube hl params', () => {
        expect(youtubeEmbedHl('vi')).toBe('vi_vn');
        expect(youtubeEmbedHl('en')).toBe('en_us');
    });
});
