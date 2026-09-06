import { afterEach, describe, expect, it, vi } from "vitest";
import { isMainNotificationType } from "@35mm/db/notification-service";

async function importNotificationsWithExecute(execute: ReturnType<typeof vi.fn>) {
  vi.doMock("./db.js", function () {
    return {
      getDb: function () {
        return { execute };
      },
    };
  });

  return import("./notifications.js");
}

describe("notification read mutations", function () {
  afterEach(function () {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("marks all unread notifications in count-only batches", async function () {
    var execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ cutoff: new Date("2026-07-04T00:00:00.000Z") }] })
      .mockResolvedValueOnce({ rows: [{ updated_count: "5000" }] })
      .mockResolvedValueOnce({ rows: [{ updated_count: 7n }] })
      .mockResolvedValueOnce({ rows: [{ updated_count: 0 }] });
    var { markAllNotificationsRead } = await importNotificationsWithExecute(execute);

    var updated = await markAllNotificationsRead("9c0f305b-a39b-446e-91fd-c827187c52d6");

    expect(updated).toBe(5007);
    expect(execute).toHaveBeenCalledTimes(4);
  });
});

describe("main notification boundary", function () {
  it("rejects chat-owned activity", function () {
    expect(isMainNotificationType("chat_reaction")).toBe(false);
    expect(isMainNotificationType("like")).toBe(true);
    expect(isMainNotificationType("content_moderated")).toBe(true);
  });
});
