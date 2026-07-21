import { describe, expect, it } from "vitest";
import {
  advanceFeedFanoutBackfillCursor,
  parseFeedFanoutBackfillArgs,
} from "./backfillFeedFanout.js";

describe("parseFeedFanoutBackfillArgs", function () {
  it("requires a bounded timestamp window", function () {
    expect(function () {
      parseFeedFanoutBackfillArgs([]);
    }).toThrow("--from is required");

    expect(function () {
      parseFeedFanoutBackfillArgs([
        "--from=2026-07-21T12:00:00Z",
        "--to=2026-07-21T11:00:00Z",
      ]);
    }).toThrow("--from must be earlier than --to");
  });

  it("parses dry-run and bounded batch options", function () {
    var result = parseFeedFanoutBackfillArgs([
      "--from=2026-07-20T00:00:00Z",
      "--to=2026-07-21T00:00:00Z",
      "--dry-run",
      "--limit=500",
      "--batch-size=100",
    ]);

    expect(result).toEqual({
      from: new Date("2026-07-20T00:00:00Z"),
      to: new Date("2026-07-21T00:00:00Z"),
      dryRun: true,
      limit: 500,
      batchSize: 100,
    });
  });

  it("caps batches to protect Postgres and rejects unbounded values", function () {
    var result = parseFeedFanoutBackfillArgs([
      "--from=2026-07-20T00:00:00Z",
      "--to=2026-07-21T00:00:00Z",
      "--batch-size=5000",
    ]);
    expect(result.batchSize).toBe(1000);

    expect(function () {
      parseFeedFanoutBackfillArgs([
        "--from=2026-07-20T00:00:00Z",
        "--to=2026-07-21T00:00:00Z",
        "--limit=0",
      ]);
    }).toThrow("--limit requires a positive integer");
  });

  it("preserves Postgres microsecond cursor precision and rejects stalled cursors", function () {
    var cursor = {
      createdAt: "2026-07-21 18:26:16.782408+00",
      id: "e44289d3-c582-4fd5-9750-710981992372",
    };

    expect(advanceFeedFanoutBackfillCursor(null, cursor)).toEqual(cursor);
    expect(function () {
      advanceFeedFanoutBackfillCursor(cursor, cursor);
    }).toThrow("Feed fanout backfill cursor did not advance");
  });
});
