/** Matches youtubei's YoutubeRawData without importing non-exported internals. */
export type YoutubeRawData = Record<string, unknown>;

export const asYoutubeRawData = (data: unknown): YoutubeRawData => data as YoutubeRawData;
