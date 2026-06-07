import { collectTikTokItemCoverUrls } from './cover';
import { buildTikTokItemUrl, isTikTokItemLive } from './is-live';
import type { SearchItem, TikTokSearchItem, TikTokVideo } from './types';

function normalizePlayUrl(playAddr: string | false | undefined): string {
    return typeof playAddr === 'string' ? playAddr : '';
}

function mapSearchItem(item: TikTokSearchItem): TikTokVideo {
    const author = item.author ?? { uniqueId: 'unknown', nickname: 'unknown' };
    const stats = item.stats ?? {
        playCount: 0,
        diggCount: 0,
        commentCount: 0,
        shareCount: 0,
    };
    const isLive = isTikTokItemLive(item);
    const coverUrls = collectTikTokItemCoverUrls(item);

    return {
        id: item.id,
        desc: item.desc || item.liveRoomInfo?.title || item.imagePost?.title || '',
        createTime: item.createTime,
        duration: item.video?.duration ?? 0,
        coverUrls,
        cover: coverUrls[0] ?? '',
        playUrl: normalizePlayUrl(item.video?.playAddr),
        isLive,
        isImagePost: Boolean(item.imagePost),
        imageCount: item.imagePost?.images?.length ?? 0,
        author: {
            uniqueId: author.uniqueId,
            nickname: author.nickname,
        },
        stats: {
            playCount: stats.playCount,
            diggCount: stats.diggCount,
            commentCount: stats.commentCount,
            shareCount: stats.shareCount,
        },
        url: buildTikTokItemUrl(item, author.uniqueId, isLive),
    };
}

function mapLiveCard(lives: NonNullable<SearchItem['lives']>): TikTokVideo | null {
    const author = lives.author;
    const uniqueId = author?.uniqueId;
    const id = lives.aweme_id ?? lives.group_id ?? lives.room_id ?? lives.roomId;

    if (!uniqueId || !id) {
        return null;
    }

    const coverUrls: string[] = [];
    if (typeof lives.cover === 'string' && lives.cover.startsWith('http')) {
        coverUrls.push(lives.cover);
    }

    const item: TikTokSearchItem = {
        id: String(id),
        desc: lives.title ?? '',
        createTime: 0,
        liveRoomInfo: {
            roomId: lives.room_id ?? lives.roomId,
            status: 2,
            title: lives.title,
            cover: lives.cover,
        },
        author: {
            uniqueId,
            nickname: author?.nickname ?? uniqueId,
            roomId: lives.room_id ?? lives.roomId,
        },
        stats: {
            playCount: lives.user_count ?? 0,
            diggCount: 0,
            commentCount: 0,
            shareCount: 0,
        },
    };

    return mapSearchItem(item);
}

export function parseVideos(data: SearchItem[]): TikTokVideo[] {
    const videos: TikTokVideo[] = [];

    for (const entry of data) {
        if (entry.type === 1 && entry.item?.id) {
            videos.push(mapSearchItem(entry.item));
            continue;
        }

        if (entry.lives) {
            const live = mapLiveCard(entry.lives);
            if (live) {
                videos.push(live);
            }
        }
    }

    return videos;
}
