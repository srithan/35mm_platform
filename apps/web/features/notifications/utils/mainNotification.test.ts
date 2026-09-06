import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@35mm/types";
import { isMainNotificationItem } from "./mainNotification";

function notification(type: NotificationItem["type"]): NotificationItem {
  return {
    id: "notification-1",
    type,
    actor: null,
    entity: null,
    metadata: {},
    isRead: false,
    bundleCount: 1,
    createdAt: "2026-09-04T00:00:00.000Z",
  };
}

describe("main notification boundary", function () {
  it("removes chat reactions from cached or fetched main notification pages", function () {
    var items = [notification("like"), notification("chat_reaction")];

    expect(items.filter(isMainNotificationItem).map(function (item) {
      return item.type;
    })).toEqual(["like"]);
  });
});
