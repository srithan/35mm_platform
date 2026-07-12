import { describe, expect, it } from "vitest";
import { getNotificationDestination } from "./notificationDestination";

describe("getNotificationDestination", function () {
  it("links report status updates to the exact report", function () {
    expect(getNotificationDestination({
      type: "report_status_update",
      actor: null,
      entity: null,
      metadata: { reportId: "01J00000000000000000000000" },
    })).toBe("/settings/privacy/reports/01J00000000000000000000000");
  });

  it("falls back to report history for legacy status updates without a report id", function () {
    expect(getNotificationDestination({
      type: "report_status_update",
      actor: null,
      entity: null,
      metadata: { outcome: "actioned" },
    })).toBe("/settings/privacy/reports");
  });
});
