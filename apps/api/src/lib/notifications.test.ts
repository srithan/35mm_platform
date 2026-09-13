import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotificationService, isMainNotificationType } from "@35mm/db/notification-service";

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


describe("mention delivery retries", function () {
  it("reuses the notification row and retries failed publication", async function () {
    var stored = new Map<string, string>();
    var notificationValues: { sourceKey: string } | undefined;
    var selectCall = 0;
    var db = {
      select: function () {
        var phase = selectCall++ % 3;
        return { from: function () { return { where: function () { return { limit: async function () {
          if (phase === 0) return [{ mentions: true }];
          if (phase === 1) return [{ blocked: false, muted: false }];
          return [{ id: stored.get("mention:post:post-id:recipient-id") }];
        } }; } }; } };
      },
      insert: function () {
        return { values: function (values: { sourceKey: string }) {
          notificationValues = values;
          return { onConflictDoNothing: async function () {
            if (!stored.has(values.sourceKey)) stored.set(values.sourceKey, "notification-id");
          } };
        } };
      },
    };
    var enqueuePublish = vi.fn().mockRejectedValueOnce(new Error("queue unavailable")).mockResolvedValueOnce(true);
    var service = createNotificationService({ getDb: () => db, enqueuePublish });
    var input = {
      recipientId: "recipient-id", actorId: "actor-id", type: "mention" as const,
      entityType: "post" as const, entityId: "post-id", sourceKey: "mention:post:post-id:recipient-id",
    };
    await expect(service.createNotification(input)).rejects.toThrow("queue unavailable");
    await expect(service.createNotification(input)).resolves.toEqual({ ok: true, notificationId: "notification-id", shouldPublish: true });
    expect(stored.size).toBe(1);
    expect(notificationValues?.sourceKey).toBe(input.sourceKey);
    expect(enqueuePublish).toHaveBeenNthCalledWith(1, ["notification-id"], 0);
    expect(enqueuePublish).toHaveBeenNthCalledWith(2, ["notification-id"], 0);
  });
});
