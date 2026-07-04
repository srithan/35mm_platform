import cassandra from "cassandra-driver";
import { describe, expect, it } from "vitest";

import { fetchChatMessages, messageBucketsNewestFirst } from "./routes.js";

type TestMessageRow = Awaited<ReturnType<typeof fetchChatMessages>>["rows"][number];

function makeMessageRow(id: string, bucket: number): TestMessageRow {
  return {
    thread_id: "thread-1",
    bucket,
    message_id: {
      toString: function () {
        return id;
      },
    },
    sender_id: "sender-1",
    content_type: "text",
    body: "hello",
    media_url: null,
    media_meta: null,
    link_preview: null,
    reply_to_id: null,
    reply_snapshot: null,
    reactions: {},
    is_deleted: false,
    deleted_at: null,
    edited_at: null,
    created_at: null,
  } as TestMessageRow;
}

describe("chat message bucket paging", function () {
  it("stops bucket reads after page is full", async function () {
    var buckets: number[] = [];
    var result = await fetchChatMessages(
      "thread-1",
      null,
      3,
      async function (input) {
        buckets.push(input.bucket);
        return [
          makeMessageRow("m1", input.bucket),
          makeMessageRow("m2", input.bucket),
          makeMessageRow("m3", input.bucket),
          makeMessageRow("m4", input.bucket),
        ];
      },
      new Date("2026-07-01T00:00:00.000Z")
    );

    expect(result.rows).toHaveLength(3);
    expect(result.hasMore).toBe(true);
    expect(buckets).toEqual([202607]);
  });

  it("starts cursor reads at cursor message bucket", async function () {
    var buckets: number[] = [];
    var cursor = cassandra.types.TimeUuid.fromDate(new Date("2026-05-15T00:00:00.000Z"));
    await fetchChatMessages(
      "thread-1",
      cursor,
      50,
      async function (input) {
        buckets.push(input.bucket);
        return [];
      },
      new Date("2026-07-01T00:00:00.000Z")
    );

    expect(buckets).toEqual(messageBucketsNewestFirst(202605));
  });

  it("skips empty recent buckets and keeps scanning older buckets", async function () {
    var buckets: number[] = [];
    var result = await fetchChatMessages(
      "thread-1",
      null,
      3,
      async function (input) {
        buckets.push(input.bucket);
        if (input.bucket === 202605) return [];
        if (input.bucket === 202604) {
          return [
            makeMessageRow("m1", input.bucket),
            makeMessageRow("m2", input.bucket),
            makeMessageRow("m3", input.bucket),
            makeMessageRow("m4", input.bucket),
          ];
        }
        return [];
      },
      new Date("2026-07-01T00:00:00.000Z")
    );

    expect(buckets).toEqual([202607, 202606, 202605, 202604]);
    expect(result.rows).toHaveLength(3);
    expect(result.hasMore).toBe(true);
  });

  it("exhausts bucket list when rows never fill a page", async function () {
    var buckets: number[] = [];
    await fetchChatMessages(
      "thread-1",
      null,
      2,
      async function (input) {
        buckets.push(input.bucket);
        return [];
      },
      new Date("2026-07-01T00:00:00.000Z")
    );

    expect(buckets).toEqual(messageBucketsNewestFirst(202607));
  });
});
