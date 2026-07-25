import { describe, expect, it } from "vitest";
import { feedMediaUrl, fullMediaUrl, normalizePostMediaItem } from "./variants.js";

describe("media variants url selection", function () {
  it("feedMediaUrl prefers feed variant and falls back to source", function () {
    expect(
      feedMediaUrl({
        type: "image",
        url: "https://cdn.example.com/original.jpg",
        variants: {
          feed: "https://cdn.example.com/feed.webp",
        },
      })
    ).toBe("https://cdn.example.com/feed.webp");

    expect(
      feedMediaUrl({
        type: "image",
        url: "https://cdn.example.com/original.jpg",
      })
    ).toBe("https://cdn.example.com/original.jpg");
  });

  it("preserves NSFW item metadata and defaults nsfw to false", function () {
    expect(normalizePostMediaItem({
      type: "image",
      url: "https://cdn.example.com/flagged.jpg",
      key: "posts/flagged.jpg",
      nsfw: true,
      nsfwCategories: ["nudity"],
    })).toMatchObject({
      nsfw: true,
      nsfwCategories: ["nudity"],
    });

    expect(normalizePostMediaItem({
      type: "image",
      url: "https://cdn.example.com/plain.jpg",
      key: "posts/plain.jpg",
    })).toMatchObject({
      nsfw: false,
    });
  });

  it("fullMediaUrl prefers full variant and falls back to source", function () {
    expect(
      fullMediaUrl({
        type: "image",
        url: "https://cdn.example.com/original.jpg",
        variants: {
          full: "https://cdn.example.com/full.webp",
        },
      })
    ).toBe("https://cdn.example.com/full.webp");

    expect(
      fullMediaUrl({
        type: "image",
        url: "https://cdn.example.com/original.jpg",
      })
    ).toBe("https://cdn.example.com/original.jpg");
  });
});
