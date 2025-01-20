'use server';

import { Client, VideoCompact } from 'youtubei';

import { mapYoutubeiVideo } from '@/lib/utils';
import { checkEmbeddableStatus } from '@/services/youtube-api';
import { YouTubeVideo } from '@/types/youtube.type';

const youtubeiClient = new Client();

export async function getRelatedVideos(videoId: string): Promise<{ items: YouTubeVideo[] }> {
    try {
        const video = await youtubeiClient.getVideo(videoId);
        const relatedVideos = video?.related.items || [];
        const relatedVideoIds =
            relatedVideos
                .map((video) => video.id)
                .filter((id) => id !== videoId)
                .filter(Boolean) || [];

        const results = (await checkEmbeddableStatus(relatedVideoIds)) as {
            videoId: string;
            canEmbed: boolean;
        }[];

        const embeddableVideoIds = results.filter((result) => result.canEmbed);

        const embeddableVideos = relatedVideos.filter((video) =>
            embeddableVideoIds.some((result) => result.videoId === video.id),
        ) as VideoCompact[];

        return {
            items: embeddableVideos.map(mapYoutubeiVideo),
        };
    } catch {
        return {
            items: [],
        };
    }
}
