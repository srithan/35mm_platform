import type { NotificationItem } from "@35mm/types";
import { describe, expect, it } from "vitest";

import { getNotificationRowThumbnail } from "./notificationThumbnail";

function notification(input: Partial<NotificationItem>): NotificationItem {
  return {
    id: "notification-1",
    type: "like",
    actor: null,
    entity: null,
    metadata: {},
    isRead: false,
    actorIds: [],
    actorProfiles: [],
    bundleCount: 1,
    createdAt: "2026-09-21T12:00:00.000Z",
    ...input,
  };
}

describe("getNotificationRowThumbnail", function () {
  it("suppresses right-side media for follow relationship notifications", function () {
    const types: NotificationItem["type"][] = [
      "follow",
      "follow_request",
      "follow_request_approved",
    ];

    for (const type of types) {
      const item = notification({
        type,
        entity: {
          type: "user",
          id: "user-1",
          title: "Maya Frames",
          thumbnailUrl: "https://cdn.example/avatar.jpg",
        },
      });

      expect(getNotificationRowThumbnail(item)).toBeUndefined();
    }
  });

  it("keeps entity thumbnails for content notifications", function () {
    const item = notification({
      type: "like",
      entity: {
        type: "post",
        id: "post-1",
        title: "In the Mood for Love",
        thumbnailUrl: "https://cdn.example/poster.jpg",
      },
    });

    expect(getNotificationRowThumbnail(item)).toBe("https://cdn.example/poster.jpg");
  });
});
