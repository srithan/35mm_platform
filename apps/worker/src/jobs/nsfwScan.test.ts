import { describe, expect, it } from "vitest";
import type { PostMedia } from "@35mm/db/schema";
import {
  applyMediaNsfwClassifications,
  mergeNsfwCategories,
  resolveNsfwState,
} from "./nsfwScan.js";

describe("nsfw scan state", function () {
  it("never removes author-set categories", function () {
    expect(resolveNsfwState({
      existingStatus: "flagged",
      existingSource: "author",
      existingCategories: ["nudity"],
      classifiedCategories: [],
    })).toEqual({
      status: "flagged",
      source: "author",
      categories: ["nudity"],
    });
  });

  it("resolves an empty pending scan to none", function () {
    expect(resolveNsfwState({
      existingStatus: "pending",
      existingSource: null,
      existingCategories: [],
      classifiedCategories: [],
    })).toEqual({
      status: "none",
      source: "system",
      categories: [],
    });
  });

  it("merges categories as a stable union", function () {
    expect(mergeNsfwCategories(
      ["violence", "nudity"],
      ["nudity", "sensitive", "violence"]
    )).toEqual(["nudity", "violence", "sensitive"]);
  });

  it("changes only matched media items", function () {
    var media: PostMedia[] = [
      {
        type: "image",
        url: "https://media.example/one.jpg",
        key: "posts/one.jpg",
        width: 800,
        variants: { feed: "https://media.example/one-feed.webp" },
      },
      {
        type: "image",
        url: "https://media.example/two.jpg",
        key: "posts/two.jpg",
        altText: "untouched",
        variants: { full: "https://media.example/two-full.webp" },
      },
    ];
    var untouchedBefore = JSON.stringify(media[1]);
    var result = applyMediaNsfwClassifications(
      media,
      new Map([["posts/one.jpg", ["graphic_content"] as const]])
    );

    expect(result[0]).toMatchObject({
      nsfw: true,
      nsfwCategories: ["graphic_content"],
    });
    expect(JSON.stringify(result[1])).toBe(untouchedBefore);
  });
});
