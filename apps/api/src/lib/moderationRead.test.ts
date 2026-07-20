import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(function () {
  return {
    mget: vi.fn(),
  };
});

vi.mock("./redis.js", function () {
  return {
    getRedisClient: function () {
      return { mget: mocks.mget };
    },
  };
});

import { filterModeratedFeedCachePayload } from "./moderationRead.js";

describe("filterModeratedFeedCachePayload quote sources", function () {
  beforeEach(function () {
    mocks.mget.mockReset();
  });

  it("tombstones a cached quote source that was removed after caching", async function () {
    mocks.mget.mockResolvedValue(["visible", "visible", "removed", "visible"]);
    var result = await filterModeratedFeedCachePayload({
      payload: {
        items: [
          {
            id: "quote-post",
            author: { id: "quote-author" },
            quotedPost: {
              id: "source-post",
              author: { id: "source-author" },
            },
            quotedPostUnavailable: false,
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
      viewerUserId: "viewer",
      viewerIsStaff: false,
    });

    expect(result?.items).toEqual([
      expect.objectContaining({
        id: "quote-post",
        quotedPost: null,
        quotedPostUnavailable: true,
      }),
    ]);
  });

  it("keeps the source and removes hidden actors from aggregated repost proof", async function () {
    mocks.mget.mockResolvedValue([
      "visible",
      "visible",
      "removed",
      "visible",
    ]);
    var result = await filterModeratedFeedCachePayload({
      payload: {
        items: [
          {
            id: "source-post",
            author: { id: "source-author" },
            repostContext: {
              user: { id: "maya", username: "maya", displayName: "Maya" },
              users: [
                { id: "maya", username: "maya", displayName: "Maya" },
                { id: "teju", username: "teju", displayName: "Teju" },
              ],
              totalCount: 3,
              includesOriginal: true,
            },
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
      viewerUserId: "viewer",
      viewerIsStaff: false,
    });

    expect(result?.items).toEqual([
      expect.objectContaining({
        id: "source-post",
        repostContext: expect.objectContaining({
          user: expect.objectContaining({ id: "teju" }),
          users: [expect.objectContaining({ id: "teju" })],
          totalCount: 3,
          includesOriginal: true,
        }),
      }),
    ]);
  });
});
