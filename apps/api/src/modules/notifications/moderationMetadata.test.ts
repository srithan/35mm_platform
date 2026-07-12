import { describe, expect, it } from "vitest";
import { notificationMetadata } from "./routes.js";

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
