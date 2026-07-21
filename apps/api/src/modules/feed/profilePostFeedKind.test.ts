import { describe, expect, it } from "vitest";
import { profileFeedCacheKey } from "../../lib/feedCache.js";
import { parseProfilePostFeedKind } from "./routes.js";

describe("parseProfilePostFeedKind", function () {
  it("preserves the existing mixed profile feed by default", function () {
    expect(parseProfilePostFeedKind(undefined)).toBe("all");
    expect(parseProfilePostFeedKind("all")).toBe("all");
  });

  it("accepts only the repost-filtered feed kind", function () {
    expect(parseProfilePostFeedKind("reposts")).toBe("reposts");
    expect(function () {
      parseProfilePostFeedKind("likes");
    }).toThrowError("Invalid profile post feed kind");
  });

  it("partitions mixed and repost-only profile cache entries", function () {
    var base = {
      username: "Maya.Frames",
      viewerId: null,
      cursor: null,
      limit: 20,
    };

    expect(profileFeedCacheKey({ ...base, kind: "all" })).not.toBe(
      profileFeedCacheKey({ ...base, kind: "reposts" })
    );
  });
});
