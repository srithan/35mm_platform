import {
  parseChatInboxPage,
  parseChatMessagesPage,
  parseContactSearchResponse,
} from "@/features/chat/contracts";

describe("mobile chat contracts", () => {
  it("parses inbox and message pages", () => {
    expect(
      parseChatInboxPage({
        items: [{
          id: "01JCHATTHREAD000000000000001",
          type: "dm",
          members: [{
            userId: "user-2",
            username: "ava",
            displayName: "Ava",
            avatarUrl: null,
            avatarVariants: null,
            role: "member",
            joinedAt: "2026-09-13T12:00:00.000Z",
          }],
          lastMessageAt: "2026-09-13T12:01:00.000Z",
          lastMessagePreview: "Heat tonight?",
          lastSenderId: "user-2",
          unreadCount: 2,
          isArchived: false,
          isMuted: false,
          deletedAt: null,
        }],
        nextCursor: null,
        hasMore: false,
      }).items[0],
    ).toEqual(expect.objectContaining({ id: "01JCHATTHREAD000000000000001", unreadCount: 2 }));

    expect(
      parseChatMessagesPage({
        items: [{
          id: "7d9f7b90-5278-11ef-9a3d-0242ac120002",
          threadId: "01JCHATTHREAD000000000000001",
          bucket: 202609,
          senderId: "user-2",
          senderUsername: "ava",
          senderDisplayName: "Ava",
          senderAvatarUrl: null,
          senderAvatarVariants: null,
          contentType: "text",
          body: "Heat tonight?",
          mediaUrl: null,
          mediaMetadata: null,
          linkPreview: null,
          replyToId: null,
          replySnapshot: null,
          reactions: [{ emoji: "🎬", count: 1, userIds: ["user-1"], viewerReacted: true }],
          isDeleted: false,
          editedAt: null,
          createdAt: "2026-09-13T12:02:00.000Z",
        }],
        nextCursor: null,
        hasMore: false,
      }).items[0]?.reactions[0],
    ).toEqual(expect.objectContaining({ emoji: "🎬", viewerReacted: true }));
  });

  it("rejects malformed dates and parses bounded contact search", () => {
    expect(() =>
      parseChatMessagesPage({
        items: [{
          id: "message-1",
          threadId: "thread-1",
          bucket: 202609,
          senderId: "user-2",
          senderUsername: "ava",
          senderDisplayName: "Ava",
          senderAvatarUrl: null,
          senderAvatarVariants: null,
          contentType: "text",
          body: "bad date",
          mediaUrl: null,
          mediaMetadata: null,
          linkPreview: null,
          replyToId: null,
          replySnapshot: null,
          reactions: [],
          isDeleted: false,
          editedAt: null,
          createdAt: "not-a-date",
        }],
        nextCursor: null,
        hasMore: false,
      }),
    ).toThrow("ChatMessage.createdAt");

    expect(
      parseContactSearchResponse({
        users: [{
          id: "user-3",
          username: "maya",
          displayName: "Maya",
          avatarUrl: null,
          avatarUrlLg: null,
          isPrivate: false,
          followState: "following",
          isFollowing: true,
        }],
      }).users[0],
    ).toEqual(expect.objectContaining({ username: "maya", isFollowing: true }));
  });
});
