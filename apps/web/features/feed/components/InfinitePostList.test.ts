import { describe, expect, it } from "vitest";
import { resolveFeedEndMessage, resolveInfiniteScrollAction } from "./InfinitePostList";

describe("resolveInfiniteScrollAction", function () {
  it("loads only near the viewport and prefetches farther ahead", function () {
    expect(resolveInfiniteScrollAction(2_000)).toBe("idle");
    expect(resolveInfiniteScrollAction(1_200)).toBe("prefetch");
    expect(resolveInfiniteScrollAction(640)).toBe("load");
    expect(resolveInfiniteScrollAction(-20)).toBe("load");
  });
});

describe("resolveFeedEndMessage", function () {
  it("returns contextual closing copy for home and profile feeds", function () {
    expect(
      resolveFeedEndMessage({
        hasNextPage: false,
        isFetchingNextPage: false,
        isQuoteFeed: false,
      })
    ).toBe("That’s a wrap. You’re all caught up.");
    expect(
      resolveFeedEndMessage({
        hasNextPage: false,
        isFetchingNextPage: false,
        isQuoteFeed: false,
        username: "maya",
      })
    ).toBe("That’s a wrap. You’ve reached the end of this profile.");
  });

  it("stays hidden while pagination remains or on quote feeds", function () {
    expect(
      resolveFeedEndMessage({
        hasNextPage: true,
        isFetchingNextPage: false,
        isQuoteFeed: false,
      })
    ).toBeNull();
    expect(
      resolveFeedEndMessage({
        hasNextPage: false,
        isFetchingNextPage: false,
        isQuoteFeed: true,
      })
    ).toBeNull();
  });
});
