import Foundation

struct CreateChatThreadRequest: Encodable {
  let type: ChatThreadType
  let memberIds: [String]
  let name: String?

  init(type: ChatThreadType, memberIds: [String], name: String? = nil) {
    self.type = type
    self.memberIds = memberIds
    self.name = name
  }
}

struct SendChatMessageRequest: Encodable {
  let contentType: ChatMessageContentType
  let body: String?
  let mediaUrl: String?
  let mediaMetadata: ChatMediaMetadata?
  let linkPreview: ChatLinkPreview?
  let replyToId: String?

  init(
    contentType: ChatMessageContentType,
    body: String? = nil,
    mediaUrl: String? = nil,
    mediaMetadata: ChatMediaMetadata? = nil,
    linkPreview: ChatLinkPreview? = nil,
    replyToId: String? = nil
  ) {
    self.contentType = contentType
    self.body = body
    self.mediaUrl = mediaUrl
    self.mediaMetadata = mediaMetadata
    self.linkPreview = linkPreview
    self.replyToId = replyToId
  }
}

struct EditChatMessageRequest: Encodable {
  let body: String
}

struct ChatReactionRequest: Encodable {
  let emoji: String
}

struct ChatReadRequest: Encodable {
  let lastReadMessageId: ChatMessageId
}

struct ChatArchiveRequest: Encodable {
  let archived: Bool
}

struct ChatMuteRequest: Encodable {
  let mutedUntil: String?
}

struct ChatTypingRequest: Encodable {
  let isTyping: Bool
}

struct ChatPresenceBatchRequest: Encodable {
  let userIds: [String]
}

struct ChatPresenceBatchResponse: Decodable {
  let presence: [String: Bool]
}

struct ProfileSearchUser: Codable, Identifiable, Hashable {
  let id: String
  let username: String
  let displayName: String?
  let avatarUrl: String?
  let avatarUrlLg: String?
  let isPrivate: Bool?
  let followState: String?
  let isFollowing: Bool?
}

struct ProfileSearchResponse: Decodable {
  let users: [ProfileSearchUser]
}

extension APIEndpoint {
  static func getChatInbox(cursor: String?, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }

    return APIEndpoint(path: "/v1/chat/inbox", method: .get, queryItems: queryItems)
  }

  static func createChatThread(_ input: CreateChatThreadRequest) -> APIEndpoint {
    APIEndpoint(path: "/v1/chat/threads", method: .post, body: input)
  }

  static func getChatMessages(threadId: String, before: String?, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let before {
      queryItems.append(URLQueryItem(name: "before", value: before))
    }

    return APIEndpoint(
      path: "/v1/chat/threads/\(threadId)/messages",
      method: .get,
      queryItems: queryItems
    )
  }

  static func sendChatMessage(
    threadId: String,
    input: SendChatMessageRequest
  ) -> APIEndpoint {
    APIEndpoint(path: "/v1/chat/threads/\(threadId)/messages", method: .post, body: input)
  }

  static func editChatMessage(
    messageId: ChatMessageId,
    threadId: String,
    input: EditChatMessageRequest
  ) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/messages/\(messageId)",
      method: .patch,
      body: input,
      queryItems: [URLQueryItem(name: "threadId", value: threadId)]
    )
  }

  static func deleteChatMessage(messageId: ChatMessageId, threadId: String) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/messages/\(messageId)",
      method: .delete,
      queryItems: [URLQueryItem(name: "threadId", value: threadId)]
    )
  }

  static func addChatReaction(
    messageId: ChatMessageId,
    threadId: String,
    emoji: String
  ) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/messages/\(messageId)/reactions",
      method: .post,
      body: ChatReactionRequest(emoji: emoji),
      queryItems: [URLQueryItem(name: "threadId", value: threadId)]
    )
  }

  static func deleteChatReaction(
    messageId: ChatMessageId,
    threadId: String,
    emoji: String
  ) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/messages/\(messageId)/reactions/\(encodedPathSegment(emoji))",
      method: .delete,
      queryItems: [URLQueryItem(name: "threadId", value: threadId)]
    )
  }

  static func markChatThreadRead(threadId: String, lastReadMessageId: ChatMessageId) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/threads/\(threadId)/read",
      method: .patch,
      body: ChatReadRequest(lastReadMessageId: lastReadMessageId)
    )
  }

  static func getChatReadReceipts(threadId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/chat/threads/\(threadId)/read-receipts", method: .get)
  }

  static func archiveChatThread(threadId: String, archived: Bool) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/threads/\(threadId)/archive",
      method: .patch,
      body: ChatArchiveRequest(archived: archived)
    )
  }

  static func muteChatThread(threadId: String, mutedUntil: String?) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/threads/\(threadId)/mute",
      method: .patch,
      body: ChatMuteRequest(mutedUntil: mutedUntil)
    )
  }

  static func deleteChatThread(threadId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/chat/threads/\(threadId)", method: .delete)
  }

  static func setChatTyping(threadId: String, isTyping: Bool) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/threads/\(threadId)/typing",
      method: .post,
      body: ChatTypingRequest(isTyping: isTyping)
    )
  }

  static func getChatTyping(threadId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/chat/threads/\(threadId)/typing", method: .get)
  }

  static func pingChatPresence() -> APIEndpoint {
    APIEndpoint(path: "/v1/chat/presence/ping", method: .post)
  }

  static func getChatPresence(userIds: [String]) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/chat/presence/batch",
      method: .post,
      body: ChatPresenceBatchRequest(userIds: userIds)
    )
  }

  static func searchProfiles(query: String, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty {
      queryItems.append(URLQueryItem(name: "q", value: trimmed))
    }

    return APIEndpoint(path: "/v1/profiles/search", method: .get, queryItems: queryItems)
  }

  private static func encodedPathSegment(_ value: String) -> String {
    var allowed = CharacterSet.urlPathAllowed
    allowed.remove(charactersIn: "/")
    return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
  }
}

@MainActor
extension APIClient {
  func getChatInbox(cursor: String? = nil, limit: Int = 20) async throws -> ChatInboxPage {
    try await request(.getChatInbox(cursor: cursor, limit: limit))
  }

  func createChatThread(
    type: ChatThreadType,
    memberIds: [String],
    name: String? = nil
  ) async throws -> ChatThreadPreview {
    try await request(.createChatThread(.init(type: type, memberIds: memberIds, name: name)))
  }

  func getChatMessages(
    threadId: String,
    before: String? = nil,
    limit: Int = 50
  ) async throws -> ChatMessagesPage {
    try await request(.getChatMessages(threadId: threadId, before: before, limit: limit))
  }

  func sendChatMessage(
    threadId: String,
    input: SendChatMessageRequest
  ) async throws -> ChatMessage {
    try await request(.sendChatMessage(threadId: threadId, input: input))
  }

  func editChatMessage(
    messageId: ChatMessageId,
    threadId: String,
    body: String
  ) async throws -> ChatMessage {
    try await request(.editChatMessage(
      messageId: messageId,
      threadId: threadId,
      input: .init(body: body)
    ))
  }

  func deleteChatMessage(messageId: ChatMessageId, threadId: String) async throws {
    try await requestVoid(.deleteChatMessage(messageId: messageId, threadId: threadId))
  }

  func addChatReaction(messageId: ChatMessageId, threadId: String, emoji: String) async throws -> ChatMessage {
    try await request(.addChatReaction(messageId: messageId, threadId: threadId, emoji: emoji))
  }

  func deleteChatReaction(messageId: ChatMessageId, threadId: String, emoji: String) async throws -> ChatMessage {
    try await request(.deleteChatReaction(messageId: messageId, threadId: threadId, emoji: emoji))
  }

  func markChatThreadRead(threadId: String, lastReadMessageId: ChatMessageId) async throws {
    try await requestVoid(.markChatThreadRead(threadId: threadId, lastReadMessageId: lastReadMessageId))
  }

  func getChatReadReceipts(threadId: String) async throws -> ChatReadReceiptsResponse {
    try await request(.getChatReadReceipts(threadId: threadId))
  }

  func archiveChatThread(threadId: String, archived: Bool) async throws {
    try await requestVoid(.archiveChatThread(threadId: threadId, archived: archived))
  }

  func muteChatThread(threadId: String, mutedUntil: String?) async throws {
    try await requestVoid(.muteChatThread(threadId: threadId, mutedUntil: mutedUntil))
  }

  func deleteChatThread(threadId: String) async throws {
    try await requestVoid(.deleteChatThread(threadId: threadId))
  }

  func setChatTyping(threadId: String, isTyping: Bool) async throws {
    try await requestVoid(.setChatTyping(threadId: threadId, isTyping: isTyping))
  }

  func getChatTyping(threadId: String) async throws -> ChatTypingSnapshot {
    try await request(.getChatTyping(threadId: threadId))
  }

  func pingChatPresence() async throws {
    try await requestVoid(.pingChatPresence())
  }

  func getChatPresence(userIds: [String]) async throws -> [String: Bool] {
    let response: ChatPresenceBatchResponse = try await request(.getChatPresence(userIds: userIds))
    return response.presence
  }

  func searchProfiles(query: String, limit: Int = 8) async throws -> [ProfileSearchUser] {
    let response: ProfileSearchResponse = try await request(.searchProfiles(query: query, limit: limit))
    return response.users
  }
}
