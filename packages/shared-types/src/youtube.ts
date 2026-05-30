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

export type YouTubeVideo = {
  id: string;
  duration: number;
  duration_formatted: string;
  title: string;
  type: SearchType;
  uploadedAt: string;
  url: string;
  views: number;
  channels: YouTubeChannel[];
  thumbnail: {
    url: string;
  };
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
