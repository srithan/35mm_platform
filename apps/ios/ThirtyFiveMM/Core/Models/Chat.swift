import Foundation

typealias ChatMessageId = String

enum ChatThreadType: String, Codable, Hashable {
  case dm
  case group
}

enum ChatMessageContentType: String, Codable, Hashable {
  case text
  case image
  case gif
  case file
  case link
}

enum ChatMemberRole: String, Codable, Hashable {
  case member
  case admin
}

struct ChatMember: Codable, Hashable, Identifiable {
  var id: String { userId }

  let userId: String
  let username: String
  let displayName: String
  let avatarUrl: String?
  let avatarVariants: [String: String]?
  let role: ChatMemberRole
  let joinedAt: Date
}

struct MessageReplySnapshot: Codable, Hashable {
  let senderId: String
  let senderUsername: String
  let body: String?
  let contentType: ChatMessageContentType
}

struct MessageReaction: Codable, Hashable {
  let emoji: String
  let count: Int
  let userIds: [String]
  let viewerReacted: Bool
}

struct ChatMediaMetadata: Codable, Hashable {
  let width: Int?
  let height: Int?
  let size: Int?
  let mimeType: String?
  let blurhash: String?
}

struct ChatLinkPreview: Codable, Hashable {
  let url: String
  let title: String?
  let description: String?
  let imageUrl: String?
  let siteName: String?
}

struct ChatMessage: Codable, Hashable, Identifiable {
  let id: ChatMessageId
  let threadId: String
  let bucket: Int
  let senderId: String
  let senderUsername: String
  let senderDisplayName: String
  let senderAvatarUrl: String?
  let senderAvatarVariants: [String: String]?
  let contentType: ChatMessageContentType
  let body: String?
  let mediaUrl: String?
  let mediaMetadata: ChatMediaMetadata?
  let linkPreview: ChatLinkPreview?
  let replyToId: String?
  let replySnapshot: MessageReplySnapshot?
  let reactions: [MessageReaction]
  let isDeleted: Bool
  let editedAt: Date?
  let createdAt: Date
}

struct ChatThreadPreview: Codable, Hashable, Identifiable {
  let id: String
  let type: ChatThreadType
  let members: [ChatMember]
  let lastMessageAt: Date?
  let lastMessagePreview: String?
  let lastSenderId: String?
  let unreadCount: Int
  let isArchived: Bool
  let isMuted: Bool
  let deletedAt: Date?
}

struct ChatMessagesPage: Codable, Hashable {
  let items: [ChatMessage]
  let nextCursor: String?
  let hasMore: Bool
}

struct ChatInboxPage: Codable, Hashable {
  let items: [ChatThreadPreview]
  let nextCursor: String?
  let hasMore: Bool
}

struct ChatTypingUser: Codable, Hashable, Identifiable {
  var id: String { userId }

  let userId: String
  let username: String
  let avatarUrl: String?
}

struct ChatTypingSnapshot: Codable, Hashable {
  let typingUserIds: [String]
  let items: [ChatTypingUser]
}

struct ChatReadReceipt: Codable, Hashable, Identifiable {
  var id: String { userId }

  let userId: String
  let username: String
  let lastReadMessageId: ChatMessageId
}

struct ChatReadReceiptsResponse: Codable, Hashable {
  let items: [ChatReadReceipt]
}
