import type { Video } from "youtube-sr";
import type { SearchType } from "youtubei";

export interface SearchResults {
  items?: YouTubeVideo[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

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
  channel: {
    name: string;
    verified: boolean;
  };
  channels: Array<{
    name: string;
    verified: boolean;
  }>;
  thumbnail: {
    url: string;
  };
  type: SearchType;
};
