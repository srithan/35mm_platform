import { describe, expect, it } from "vitest";
import { shouldAutoHideCandidate } from "./moderationAutoHide.js";

describe("moderation auto-hide threshold", function () {
  var base = {
    stateStatus: "visible",
    reportCount: 5,
    recentReportCount: 5,
    followerCount: 49_999,
    threshold: 5,
    trustedFollowerThreshold: 50_000,
  };

  it("hides exactly at threshold inside window for an untrusted author", function () {
    expect(shouldAutoHideCandidate(base)).toBe(true);
  });

  it("does not hide below total or recent-window threshold", function () {
    expect(shouldAutoHideCandidate({ ...base, reportCount: 4 })).toBe(false);
    expect(shouldAutoHideCandidate({ ...base, recentReportCount: 4 })).toBe(false);
  });

  it("exempts trusted-follower authors at threshold", function () {
    expect(shouldAutoHideCandidate({ ...base, followerCount: 50_000 })).toBe(false);
    expect(shouldAutoHideCandidate({ ...base, followerCount: 100_000 })).toBe(false);
  });

  it("is a no-op for already hidden or removed content", function () {
    expect(shouldAutoHideCandidate({ ...base, stateStatus: "hidden" })).toBe(false);
    expect(shouldAutoHideCandidate({ ...base, stateStatus: "removed" })).toBe(false);
  });
});
