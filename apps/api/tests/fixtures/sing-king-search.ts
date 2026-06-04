import type { YouTubeVideo } from '@vkara/youtube';

/** Representative Sing King–style row (channel often disables embedding on third-party sites). */
export const SING_KING_CHANNEL_NAME = 'Sing King';

const SING_KING_VIDEO_IDS = [
    'kJQP7kiw5Fk',
    'OPf0YbXqDm0',
    'CevxZvSJLk8',
    '2Vv-BfVoq4g',
    'RgKAFK5djSk',
    'JGwWNGJdvx8',
    'fRh_vgS2dFE',
    'kXYiU_JCYtU',
    '9bZkp7q19f0',
    'hT_nvWreIhg',
    'YQHsXMglC9A',
    '09R8_2nJtjg',
    '7wtfhZwyrcc',
    'LP-EO9Iio-k',
    'nfWlot7hVOo',
    'uelHwf8o7_U',
    'y6120QOlsfU',
    'Zi_XLOBDo_Y',
    '60ItHLzVW_A',
    'SlPhMPnDT4w',
] as const;

const SING_KING_FIXTURE_SIZE: number = SING_KING_VIDEO_IDS.length;

export function buildSingKingStyleSearchPage(count: number = SING_KING_FIXTURE_SIZE): YouTubeVideo[] {
    const limit = Math.min(count, SING_KING_FIXTURE_SIZE);
    return SING_KING_VIDEO_IDS.slice(0, limit).map((id, index) => ({
        id,
        title: `Sing King Karaoke ${index + 1}`,
        duration: 240,
        duration_formatted: '4:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${id}`,
        uploadedAt: '2024-01-01',
        views: 1_000_000 + index,
        channels: [{ name: SING_KING_CHANNEL_NAME, verified: true }],
        thumbnails: [{ url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, width: 480, height: 360 }],
    }));
}
