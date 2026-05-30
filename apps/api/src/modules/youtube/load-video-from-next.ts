import { Client, LiveVideo, Video } from 'youtubei';

import { postInnertube } from './innertube-post';
import { asYoutubeRawData } from './youtubei-raw-data';

type LoadedVideo = Video | LiveVideo;

type WatchNextResponse = {
    contents?: {
        twoColumnWatchNextResults?: {
            results?: {
                results?: {
                    contents?: unknown[];
                };
            };
        };
    };
};

type PlayerResponse = {
    playabilityStatus?: {
        status?: string;
        liveStreamability?: unknown;
    };
};

export async function loadVideoFromNextResponses(
    client: Client,
    videoId: string,
): Promise<{ video: LoadedVideo | undefined; nextResponseData: unknown }> {
    const [nextResponse, playerResponse] = await Promise.all([
        postInnertube(client, '/youtubei/v1/next', { videoId }),
        postInnertube(client, '/youtubei/v1/player', { videoId }),
    ]);

    const nextData = asYoutubeRawData(nextResponse.data) as WatchNextResponse;
    const playerData = asYoutubeRawData(playerResponse.data) as PlayerResponse;
    const data = {
        response: nextResponse.data,
        playerResponse: playerResponse.data,
    };

    const contents =
        nextData.contents?.twoColumnWatchNextResults?.results?.results?.contents;
    const playabilityStatus = playerData.playabilityStatus?.status;

    if (!contents || playabilityStatus === 'ERROR') {
        return { video: undefined, nextResponseData: nextResponse.data };
    }

    const video = !playerData.playabilityStatus?.liveStreamability
        ? new Video({ client }).load(data)
        : new LiveVideo({ client }).load(data);

    return { video, nextResponseData: nextResponse.data };
}
