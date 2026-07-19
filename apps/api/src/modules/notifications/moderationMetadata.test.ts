import { describe, expect, it } from "vitest";
import { notificationContentPreview, notificationMetadata } from "./routes.js";

describe("notificationMetadata", function () {
  it("recovers report ids for existing moderation notifications", function () {
    expect(notificationMetadata({
      type: "report_status_update",
      metadata: { outcome: "actioned" },
      sourceKey: "moderation:reporter:01J00000000000000000000000",
    })).toEqual({
      outcome: "actioned",
      reportId: "01J00000000000000000000000",
    });
  });

  it("does not expose malformed source keys", function () {
    expect(notificationMetadata({
      type: "report_status_update",
      metadata: { outcome: "dismissed" },
      sourceKey: "moderation:reporter:not-a-report-id",
    })).toEqual({ outcome: "dismissed" });
  });
});

describe("notificationContentPreview", function () {
  it("renders rich post content as a bounded plain-text excerpt", function () {
    var body = "__35MM_RICH_TEXT_V1__" + JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First paragraph" }] },
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "11111111-1111-4111-8111-111111111111", label: "maya" },
            },
          ],
        },
      ],
    });

    expect(notificationContentPreview(["A headline", body])).toBe(
      "A headline — First paragraph @maya"
    );
  });

  it("caps notification payload text without splitting Unicode characters", function () {
    var preview = notificationContentPreview(["🎬".repeat(300)]);

    expect(Array.from(preview ?? "")).toHaveLength(280);
    expect(preview?.endsWith("…")).toBe(true);
  });

  it("recovers visible text from a bounded rich-text source", function () {
    var body = "__35MM_RICH_TEXT_V1__" + JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: 'A "sharp" review' }] }],
    });

    expect(notificationContentPreview([body.slice(0, -3)])).toBe('A "sharp" review');
  });
});
