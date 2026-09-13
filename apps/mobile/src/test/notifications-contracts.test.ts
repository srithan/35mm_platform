import { parseNotificationPage } from "@/features/notifications/contracts";

describe("mobile notification contracts", () => {
  it("parses bounded notification pages and filters chat reactions", () => {
    expect(
      parseNotificationPage({
        items: [
          {
            id: "notif-1",
            type: "like",
            actor: {
              id: "user-1",
              username: "ava",
              displayName: "Ava",
              avatarUrl: null,
            },
            entity: {
              type: "post",
              id: "530784aa-d70d-4c51-b846-2fea9ff2c632",
              title: "Heat",
              thumbnailUrl: null,
              contentPreview: "Perfect ending.",
              username: "michael",
            },
            metadata: {},
            isRead: false,
            bundleCount: 1,
            createdAt: "2026-09-13T12:00:00.000Z",
          },
          {
            id: "notif-2",
            type: "chat_reaction",
            actor: null,
            entity: null,
            metadata: {},
            isRead: false,
            bundleCount: 1,
            createdAt: "2026-09-13T12:01:00.000Z",
          },
        ],
        nextCursor: null,
        hasMore: false,
      }),
    ).toEqual({
      items: [
        expect.objectContaining({
          id: "notif-1",
          type: "like",
          isRead: false,
          entity: expect.objectContaining({ type: "post", title: "Heat" }),
        }),
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("rejects malformed notification dates", () => {
    expect(() =>
      parseNotificationPage({
        items: [{
          id: "notif-1",
          type: "follow",
          actor: null,
          entity: null,
          metadata: {},
          isRead: false,
          bundleCount: 1,
          createdAt: "not-a-date",
        }],
        nextCursor: null,
        hasMore: false,
      }),
    ).toThrow("NotificationItem.createdAt");
  });
});
