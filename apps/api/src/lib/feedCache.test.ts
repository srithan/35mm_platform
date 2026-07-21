import { describe, expect, it } from "vitest";
import { FEED_CACHE_NAMESPACE } from "@35mm/types";
import { homeFeedCacheKey, profileFeedCacheKey } from "./feedCache.js";

describe("feed cache namespace", function () {
  it("uses the shared namespace for home and profile payload keys", function () {
    expect(homeFeedCacheKey({
      viewerId: "viewer-1",
      cursor: null,
      limit: 20,
    }).startsWith(FEED_CACHE_NAMESPACE + ":")).toBe(true);

    expect(profileFeedCacheKey({
      username: "Kubrick",
      viewerId: "viewer-1",
      cursor: null,
      limit: 20,
      kind: "all",
    }).startsWith(FEED_CACHE_NAMESPACE + ":")).toBe(true);
  });
});
