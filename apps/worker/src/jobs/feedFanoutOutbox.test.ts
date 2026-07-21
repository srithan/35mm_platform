import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFeedFanoutRecoveryJobs,
  feedFanoutOutboxRetryDelayMs,
  type FeedFanoutOutboxRow,
} from "./feedFanoutOutbox.js";

afterEach(function () {
  vi.unstubAllEnvs();
});

describe("feed fanout outbox", function () {
  it("builds retry-safe jobs with unique attempt IDs", function () {
    var rows: FeedFanoutOutboxRow[] = [
      {
        id: "outbox-1",
        post_id: "post-1",
        author_user_id: "user-1",
        attempts: 3,
      },
      {
        id: "outbox-2",
        post_id: "post-2",
        author_user_id: "user-2",
        attempts: 1,
      },
    ];

    expect(buildFeedFanoutRecoveryJobs(rows)).toEqual([
      expect.objectContaining({
        name: "feed.fanout",
        data: { postId: "post-1", authorUserId: "user-1" },
        opts: expect.objectContaining({ jobId: "feed.fanout-outbox-outbox-1-3" }),
      }),
      expect.objectContaining({
        name: "feed.fanout",
        data: { postId: "post-2", authorUserId: "user-2" },
        opts: expect.objectContaining({ jobId: "feed.fanout-outbox-outbox-2-1" }),
      }),
    ]);
  });

  it("caps exponential relay retry delay", function () {
    vi.stubEnv("FEED_FANOUT_OUTBOX_RETRY_BASE_MS", "1000");
    vi.stubEnv("FEED_FANOUT_OUTBOX_RETRY_MAX_MS", "8000");

    expect(feedFanoutOutboxRetryDelayMs(1)).toBe(1000);
    expect(feedFanoutOutboxRetryDelayMs(4)).toBe(8000);
    expect(feedFanoutOutboxRetryDelayMs(20)).toBe(8000);
  });
});
