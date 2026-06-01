import { describe, expect, it } from 'vitest';

import {
    buildYouTubeThumbnails,
    getYouTubeThumbnailSrcSet,
    getYouTubeThumbnailUrl,
    normalizeVideoThumbnails,
} from '@src/youtube-thumbnail';

describe("buildYouTubeThumbnails", () => {
  it("merges youtubei hqdefault with canonical maxresdefault sizes", () => {
    const thumbnails = buildYouTubeThumbnails("o5NHDzGV5o4", [
      {
        url: "https://i.ytimg.com/vi/o5NHDzGV5o4/hqdefault.jpg?signed=1",
        width: 336,
        height: 188,
      },
    ]);

    expect(thumbnails[0]?.url).toContain("/default.jpg");
    expect(thumbnails.at(-1)?.url).toContain("/maxresdefault.jpg");
    expect(thumbnails.some((entry) => entry.url.includes("hqdefault"))).toBe(true);
  });

  it("prefers signed youtubei hq720 over canonical maxresdefault at the same size", () => {
    const thumbnails = buildYouTubeThumbnails("neTuy5h9lOw", [
      {
        url: "https://i.ytimg.com/vi/neTuy5h9lOw/hq720.jpg?signed=1",
        width: 1280,
        height: 720,
      },
    ]);

    expect(thumbnails.some((entry) => entry.url.includes("hq720"))).toBe(true);
    expect(thumbnails.at(-1)?.url).toContain("hq720");
  });
});

describe("getYouTubeThumbnailUrl", () => {
  it("returns smallest for list and largest for controls", () => {
    const thumbnails = buildYouTubeThumbnails("abc123");

    expect(getYouTubeThumbnailUrl(thumbnails, "list", "abc123")).toContain("/default.jpg");
    expect(getYouTubeThumbnailUrl(thumbnails, "large", "abc123")).toContain("/maxresdefault.jpg");
  });

  it("rebuilds from video id when thumbnails are sparse", () => {
    const sparse = [{ url: "https://i.ytimg.com/vi/abc/hqdefault.jpg", width: 336, height: 188 }];

    expect(getYouTubeThumbnailUrl(sparse, "large", "abc")).toContain("/maxresdefault.jpg");
    expect(getYouTubeThumbnailUrl(sparse, "list", "abc")).toContain("/default.jpg");
  });
});

describe("normalizeVideoThumbnails", () => {
  it("fills canonical sizes from video id", () => {
    const normalized = normalizeVideoThumbnails(
      [{ url: "https://i.ytimg.com/vi/abc/hqdefault.jpg", width: 336, height: 188 }],
      "abc",
    );

    expect(normalized.length).toBeGreaterThan(2);
    expect(normalized.at(-1)?.url).toContain("/maxresdefault.jpg");
  });
});

describe("getYouTubeThumbnailSrcSet", () => {
  it("builds width descriptors for responsive images", () => {
    const srcSet = getYouTubeThumbnailSrcSet(buildYouTubeThumbnails("abc123"), "abc123");

    expect(srcSet).toContain("120w");
    expect(srcSet).toContain("1280w");
  });
});
