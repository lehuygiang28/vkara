import type { Video } from "youtube-sr";
import type { SearchType } from "youtubei";

export interface SearchResults {
  items?: YouTubeVideo[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export type YouTubeChannel = {
  name: string;
  verified: boolean;
};

export type YouTubeVideo = Omit<
  ReturnType<Video["toJSON"]>,
  | "shorts_url"
  | "description"
  | "unlisted"
  | "nsfw"
  | "tags"
  | "ratings"
  | "shorts"
  | "live"
  | "private"
  | "music"
  | "channel"
  | "thumbnail"
  | "type"
> & {
  channels: YouTubeChannel[];
  thumbnail: {
    url: string;
  };
  type: SearchType;
  /** Active YouTube livestream (no fixed duration). */
  isLive?: boolean;
};

/** Legacy payloads may still include `channel`; normalize to `channels` for UI. */
export function normalizeVideoChannels(
  video: {
    channels?: YouTubeChannel[];
    channel?: { name: string; verified?: boolean };
  },
): YouTubeChannel[] {
  if (video.channels && video.channels.length > 0) {
    return video.channels;
  }
  if (video.channel?.name) {
    return [{ name: video.channel.name, verified: video.channel.verified ?? false }];
  }
  return [{ name: "—", verified: false }];
}
