import { describe, expect, it } from "vitest";
import type { Post } from "../types/feed";
import { deduplicateFeedPosts } from "./repostDeduplication";

function post(input: {
  id: string;
  repostCount: number;
  repostContext?: Post["repostContext"];
}): Post {
  return {
    id: input.id,
    author: {
      id: "source-user",
      username: "source",
      displayName: "Source",
      avatarUrl: null,
      isFollowing: false,
    },
    type: "text",
    body: "Original",
    media: [],
    film: null,
    likeCount: 0,
    commentCount: 0,
    repostCount: input.repostCount,
    bookmarkCount: 0,
    isLiked: false,
    isReposted: true,
    isBookmarked: false,
    repostContext: input.repostContext ?? null,
    createdAt: "2026-07-18T16:00:00.000Z",
    updatedAt: "2026-07-18T16:00:00.000Z",
  };
}

function context(id: string, displayName: string): NonNullable<Post["repostContext"]> {
  var user = { id, username: id, displayName };
  return {
    activityId: `activity-${id}`,
    repostedAt: "2026-07-19T16:00:00.000Z",
    user,
    users: [user],
    totalCount: 3,
    includesOriginal: false,
  };
}

describe("deduplicateFeedPosts", function () {
  it("merges original and repost rows across cursor pages", function () {
    var result = deduplicateFeedPosts([
      post({ id: "source-post", repostCount: 3 }),
      post({ id: "source-post", repostCount: 3, repostContext: context("maya", "Maya") }),
      post({ id: "source-post", repostCount: 3, repostContext: context("teju", "Teju") }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].repostContext).toMatchObject({
      users: [
        { id: "maya", displayName: "Maya" },
        { id: "teju", displayName: "Teju" },
      ],
      totalCount: 3,
      includesOriginal: true,
    });
  });
});
