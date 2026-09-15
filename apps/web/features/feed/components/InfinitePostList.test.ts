import { describe, expect, it } from "vitest";
import { resolveInfiniteScrollAction } from "./InfinitePostList";

describe("resolveInfiniteScrollAction", function () {
  it("loads only near the viewport and prefetches farther ahead", function () {
    expect(resolveInfiniteScrollAction(2_000)).toBe("idle");
    expect(resolveInfiniteScrollAction(1_200)).toBe("prefetch");
    expect(resolveInfiniteScrollAction(640)).toBe("load");
    expect(resolveInfiniteScrollAction(-20)).toBe("load");
  });
});
