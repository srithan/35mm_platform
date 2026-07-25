import { describe, expect, it } from "vitest";
import { arePostCardPropsEqual } from "./postCardPropsEqual";
import type { PostCardProps } from "./types";

function baseProps(): PostCardProps {
  return {
    variant: "image",
    username: "Ava",
    handle: "@ava",
    timestamp: "now",
    avatarInitial: "A",
    text: "A frame",
    likeCount: 0,
    repostCount: 0,
    commentCount: 0,
  };
}

describe("arePostCardPropsEqual NSFW fields", function () {
  it("rerenders when the post classification changes", function () {
    const previous = {
      ...baseProps(),
      nsfw: { status: "pending", categories: [], source: null },
    } satisfies PostCardProps;
    const next = {
      ...previous,
      nsfw: { status: "flagged", categories: ["nudity"], source: "system" },
    } satisfies PostCardProps;

    expect(arePostCardPropsEqual(previous, next)).toBe(false);
  });

  it("rerenders when a per-media flag changes", function () {
    const previous = {
      ...baseProps(),
      media: [{ type: "image", url: "/frame.jpg", nsfw: false }],
    } satisfies PostCardProps;
    const next = {
      ...previous,
      media: [{ ...previous.media[0], nsfw: true, nsfwCategories: ["nudity"] }],
    } satisfies PostCardProps;

    expect(arePostCardPropsEqual(previous, next)).toBe(false);
  });
});
