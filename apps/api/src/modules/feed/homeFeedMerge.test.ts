import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEED_ITEMS_RETENTION_DAYS,
  computeFeedScore,
  feedItemsRetentionBoundary,
  parseFeedItemsRetentionDays,
} from "@35mm/types";
import {
  mergeHomeFeedRows,
  rankHighFollowerAuthorCacheRows,
  shouldUseColdFeedFallback,
} from "./routes.js";
import {
  DEFAULT_FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT,
  DEFAULT_FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS,
  DEFAULT_FEED_HIGH_FOLLOWER_THRESHOLD,
  parseFeedHighFollowerCachePostLimit,
  parseFeedHighFollowerCacheTtlSeconds,
  parseFeedHighFollowerThreshold,
} from "./fanoutConfig.js";

function row(id: string, timestamp: string) {
  return {
    id,
    cursorId: id,
    cursorScore: new Date(timestamp).getTime(),
    cursorCreatedAt: new Date(timestamp),
    cursorRetentionCreatedAt: new Date(timestamp),
  };
}

describe("home feed merge", function () {
  it("interleaves materialized rows and live high-follower rows by score cursor", function () {
    var merged = mergeHomeFeedRows(
      [row("10000000-0000-4000-8000-000000000001", "2026-06-21T10:00:00.000Z")],
      [row("20000000-0000-4000-8000-000000000001", "2026-06-21T11:00:00.000Z")],
      10
    );

    expect(merged.rows.map(function (item) { return item.id; })).toEqual([
      "20000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000001",
    ]);
    expect(merged.hasMore).toBe(false);
  });

  it("dedupes rows by post id before limiting", function () {
    var duplicate = row("10000000-0000-4000-8000-000000000001", "2026-06-21T10:00:00.000Z");
    var merged = mergeHomeFeedRows([duplicate], [duplicate], 1);

    expect(merged.rows).toHaveLength(1);
    expect(merged.hasMore).toBe(false);
  });

  it("reports hasMore when merged rows exceed requested limit", function () {
    var merged = mergeHomeFeedRows(
      [
        row("30000000-0000-4000-8000-000000000001", "2026-06-21T12:00:00.000Z"),
        row("20000000-0000-4000-8000-000000000001", "2026-06-21T11:00:00.000Z"),
      ],
      [row("10000000-0000-4000-8000-000000000001", "2026-06-21T10:00:00.000Z")],
      2
    );

    expect(merged.rows).toHaveLength(2);
    expect(merged.hasMore).toBe(true);
  });
});

describe("feed fanout config", function () {
  it("uses architecture threshold by default", function () {
    expect(parseFeedHighFollowerThreshold(undefined)).toBe(DEFAULT_FEED_HIGH_FOLLOWER_THRESHOLD);
  });

  it("accepts positive env override and clamps invalid values", function () {
    expect(parseFeedHighFollowerThreshold("25000")).toBe(25000);
    expect(parseFeedHighFollowerThreshold("0")).toBe(1);
    expect(parseFeedHighFollowerThreshold("nope")).toBe(DEFAULT_FEED_HIGH_FOLLOWER_THRESHOLD);
  });

  it("uses short high-follower cache defaults and clamps overrides", function () {
    expect(parseFeedHighFollowerCacheTtlSeconds(undefined)).toBe(
      DEFAULT_FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS
    );
    expect(parseFeedHighFollowerCacheTtlSeconds("60")).toBe(60);
    expect(parseFeedHighFollowerCacheTtlSeconds("1")).toBe(5);
    expect(parseFeedHighFollowerCacheTtlSeconds("9999")).toBe(300);
    expect(parseFeedHighFollowerCachePostLimit(undefined)).toBe(
      DEFAULT_FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT
    );
    expect(parseFeedHighFollowerCachePostLimit("10")).toBe(20);
    expect(parseFeedHighFollowerCachePostLimit("9999")).toBe(500);
  });
});

function cachedAuthorRow(input: {
  id: string;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
}) {
  return {
    id: input.id,
    type: "text" as const,
    headline: null,
    body: "post",
    visibility: "public" as const,
    filmId: null,
    filmTmdbId: null,
    filmTitle: null,
    filmYear: null,
    filmPosterUrl: null,
    filmGenres: null,
    filmRating: null,
    media: [],
    mediaUrls: [],
    linkPreview: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    editedAt: null,
    authorId: "90000000-0000-4000-8000-000000000001",
    username: "author",
    displayName: "Author",
    avatarUrl: null,
    role: null,
    roleContext: null,
    profileHeadline: null,
    profileHeadlineContext: null,
    filmsLoggedCount: 0,
    likeCount: input.likeCount ?? 0,
    commentCount: input.commentCount ?? 0,
    repostCount: input.repostCount ?? 0,
    bookmarkCount: 0,
    isDeleted: false,
  };
}

describe("high-follower author cache ranking", function () {
  it("computes scores at request time and applies score cursor", function () {
    var now = new Date("2026-06-21T12:00:00.000Z");
    var first = cachedAuthorRow({
      id: "30000000-0000-4000-8000-000000000001",
      createdAt: "2026-06-21T11:00:00.000Z",
    });
    var second = cachedAuthorRow({
      id: "20000000-0000-4000-8000-000000000001",
      createdAt: "2026-06-20T12:00:00.000Z",
      likeCount: 100,
      commentCount: 20,
      repostCount: 10,
    });
    var ranked = rankHighFollowerAuthorCacheRows({
      rows: [second, first],
      rankingAsOf: now,
      scoreCursor: null,
      limit: 2,
    });

    expect(ranked.map(function (item) { return item.id; })).toEqual([
      "20000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000001",
    ]);

    var afterCursor = rankHighFollowerAuthorCacheRows({
      rows: [second, first],
      rankingAsOf: now,
      scoreCursor: {
        score: ranked[0].cursorScore,
        id: ranked[0].cursorId,
        asOf: now,
        retentionCreatedAt: null,
        legacy: false,
      },
      limit: 2,
    });

    expect(afterCursor.map(function (item) { return item.id; })).toEqual([
      "30000000-0000-4000-8000-000000000001",
    ]);
  });
});

describe("feed retention config", function () {
  it("uses 30 days by default and clamps overrides", function () {
    expect(parseFeedItemsRetentionDays(undefined)).toBe(DEFAULT_FEED_ITEMS_RETENTION_DAYS);
    expect(parseFeedItemsRetentionDays("14")).toBe(14);
    expect(parseFeedItemsRetentionDays("0")).toBe(1);
    expect(parseFeedItemsRetentionDays("nope")).toBe(DEFAULT_FEED_ITEMS_RETENTION_DAYS);
  });

  it("switches to cold fallback when cursor reaches retention boundary", function () {
    var now = new Date("2026-06-21T12:00:00.000Z");
    var boundary = feedItemsRetentionBoundary(now, 30);

    expect(shouldUseColdFeedFallback({
      cursor: null,
      retentionBoundary: boundary,
      rankingAsOf: now,
    })).toBe(false);

    expect(shouldUseColdFeedFallback({
      cursor: {
        score: 1,
        id: "10000000-0000-4000-8000-000000000001",
        asOf: now,
        retentionCreatedAt: new Date("2026-05-21T12:00:00.000Z"),
        legacy: false,
      },
      retentionBoundary: boundary,
      rankingAsOf: now,
    })).toBe(true);

    expect(shouldUseColdFeedFallback({
      cursor: {
        score: 1,
        id: "10000000-0000-4000-8000-000000000001",
        asOf: now,
        retentionCreatedAt: new Date("2026-05-23T12:00:00.000Z"),
        legacy: false,
      },
      retentionBoundary: boundary,
      rankingAsOf: now,
    })).toBe(false);
  });

  it("does not switch to cold fallback for live cursors without retention anchor", function () {
    var now = new Date("2026-06-21T12:00:00.000Z");
    var boundary = feedItemsRetentionBoundary(now, 30);

    expect(shouldUseColdFeedFallback({
      cursor: {
        score: 1,
        id: "10000000-0000-4000-8000-000000000001",
        asOf: now,
        retentionCreatedAt: null,
        legacy: false,
      },
      retentionBoundary: boundary,
      rankingAsOf: now,
    })).toBe(false);
  });

  it("does not switch to cold fallback for retained backfilled old posts", function () {
    var now = new Date("2026-06-21T12:00:00.000Z");
    var boundary = feedItemsRetentionBoundary(now, 30);

    expect(shouldUseColdFeedFallback({
      cursor: {
        score: 1,
        id: "10000000-0000-4000-8000-000000000001",
        asOf: now,
        retentionCreatedAt: new Date("2026-06-20T12:00:00.000Z"),
        legacy: false,
      },
      retentionBoundary: boundary,
      rankingAsOf: now,
    })).toBe(false);
  });

  it("falls back to score threshold for older cursors without retention anchor", function () {
    var now = new Date("2026-06-21T12:00:00.000Z");
    var boundary = feedItemsRetentionBoundary(now, 30);
    var boundaryScore = computeFeedScore({
      createdAt: boundary,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      now,
    });

    expect(shouldUseColdFeedFallback({
      cursor: {
        score: boundaryScore,
        id: "10000000-0000-4000-8000-000000000001",
        asOf: now,
        retentionCreatedAt: null,
        legacy: true,
      },
      retentionBoundary: boundary,
      rankingAsOf: now,
    })).toBe(true);
  });
});

describe("feed scoring", function () {
  it("rewards engagement while decaying older posts", function () {
    var now = new Date("2026-06-21T12:00:00.000Z");
    var freshQuiet = computeFeedScore({
      createdAt: "2026-06-21T11:00:00.000Z",
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      now,
    });
    var oldQuiet = computeFeedScore({
      createdAt: "2026-06-18T12:00:00.000Z",
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      now,
    });
    var oldEngaged = computeFeedScore({
      createdAt: "2026-06-18T12:00:00.000Z",
      likeCount: 10,
      commentCount: 4,
      repostCount: 2,
      now,
    });

    expect(freshQuiet).toBeGreaterThan(oldQuiet);
    expect(oldEngaged).toBeGreaterThan(oldQuiet);
  });
});
