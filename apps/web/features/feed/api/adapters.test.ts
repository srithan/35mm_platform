import { describe, expect, it } from "vitest";
import { adaptPostToFeedType } from "./adapters";

describe("adaptPostToFeedType film viewing metadata", function () {
  it("keeps a viewing date independent of the posting timestamp", function () {
    const post = adaptPostToFeedType({
      id: "film-log",
      type: "review",
      body: "Still wonderful.",
      watchedOn: "2026-07-01",
      watchVenue: "theater",
      isRewatch: true,
      createdAt: "2026-09-13T02:00:00.000Z",
      visibility: "private",
    });

    expect(post).toMatchObject({
      watchedOn: "2026-07-01",
      watchVenue: "theater",
      isRewatch: true,
      createdAt: "2026-09-13T02:00:00.000Z",
      visibility: "private",
    });
  });

  it("preserves legacy entries without inventing a watched date or rewatch", function () {
    const post = adaptPostToFeedType({ id: "legacy-log", type: "log" });

    expect(post.watchedOn).toBeNull();
    expect(post.watchVenue).toBeNull();
    expect(post.isRewatch).toBe(false);
  });
});

describe("adaptPostToFeedType repost context", function () {
  it("preserves original author and parses reposter context separately", function () {
    var post = adaptPostToFeedType({
      id: "original-post",
      type: "text",
      body: "Original post body",
      createdAt: "2026-07-18T16:00:00.000Z",
      updatedAt: "2026-07-18T16:00:00.000Z",
      author: {
        id: "original-user",
        username: "original",
        displayName: "Original Author",
      },
      repostContext: {
        activityId: "repost-activity",
        repostedAt: "2026-07-19T16:00:00.000Z",
        user: {
          id: "reposter-user",
          username: "reposter",
          displayName: "Reposter",
        },
      },
    });

    expect(post.id).toBe("original-post");
    expect(post.author.displayName).toBe("Original Author");
    expect(post.repostContext).toEqual({
      activityId: "repost-activity",
      repostedAt: "2026-07-19T16:00:00.000Z",
      user: {
        id: "reposter-user",
        username: "reposter",
        displayName: "Reposter",
      },
      users: [
        {
          id: "reposter-user",
          username: "reposter",
          displayName: "Reposter",
        },
      ],
      totalCount: 1,
      includesOriginal: false,
    });
  });
});

describe("adaptPostToFeedType quote context", function () {
  it("parses the quoted source as a nested post", function () {
    var post = adaptPostToFeedType({
      id: "quote-post",
      type: "text",
      body: "My commentary",
      quotedPostUnavailable: false,
      quotedPost: {
        id: "source-post",
        type: "image",
        body: "Original post body",
        createdAt: "2026-07-18T16:00:00.000Z",
        author: {
          id: "source-user",
          username: "original",
          displayName: "Original Author",
        },
        media: [{ type: "image", url: "https://media.example.com/original.jpg" }],
      },
    });

    expect(post.body).toBe("My commentary");
    expect(post.quotedPost).toMatchObject({
      id: "source-post",
      body: "Original post body",
      author: { username: "original", displayName: "Original Author" },
      media: [{ type: "image", url: "https://media.example.com/original.jpg" }],
    });
    expect(post.quotedPostUnavailable).toBe(false);
  });

  it("preserves an unavailable quoted-source tombstone", function () {
    var post = adaptPostToFeedType({
      id: "quote-post",
      type: "text",
      body: "My commentary",
      quotedPost: null,
      quotedPostUnavailable: true,
    });

    expect(post.quotedPost).toBeNull();
    expect(post.quotedPostUnavailable).toBe(true);
  });
});
