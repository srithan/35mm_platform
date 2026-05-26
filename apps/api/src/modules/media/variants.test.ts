import { describe, expect, it } from "vitest";
import { feedMediaUrl, fullMediaUrl } from "./variants.js";

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
