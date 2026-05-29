import { Client, LiveVideo, Video } from 'youtubei';

type LoadedVideo = Video | LiveVideo;

export async function loadVideoFromNextResponses(
    client: Client,
    videoId: string,
): Promise<{ video: LoadedVideo | undefined; nextResponseData: unknown }> {
    const [nextResponse, playerResponse] = await Promise.all([
        client.http.post('/youtubei/v1/next', { data: { videoId } }),
        client.http.post('/youtubei/v1/player', { data: { videoId } }),
    ]);

    const data = { response: nextResponse.data, playerResponse: playerResponse.data };
    const contents = data.response?.contents?.twoColumnWatchNextResults?.results?.results
        ?.contents;
    const playabilityStatus = data.playerResponse?.playabilityStatus?.status;

    if (!contents || playabilityStatus === 'ERROR') {
        return { video: undefined, nextResponseData: nextResponse.data };
    }

    const video = !data.playerResponse?.playabilityStatus?.liveStreamability
        ? new Video({ client }).load(data)
        : new LiveVideo({ client }).load(data);

    return { video, nextResponseData: nextResponse.data };
}
