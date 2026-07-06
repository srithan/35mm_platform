import Foundation
import UIKit

struct ChatThreadTypingUser: Identifiable, Hashable {
  var id: String { userId }

  let userId: String
  let username: String?
  let avatarUrl: String?
  let expiresAt: Date
}

@MainActor
final class ChatThreadViewModel: ObservableObject {
  @Published private(set) var messages: [ChatMessage] = []
  @Published private(set) var readReceipts: [ChatReadReceipt] = []
  @Published private(set) var typingUsers: [ChatThreadTypingUser] = []
  @Published private(set) var isLoadingInitial = false
  @Published private(set) var isLoadingOlder = false
  @Published private(set) var hasMore = true
  @Published private(set) var error: String?
  @Published private(set) var highlightedMessageId: ChatMessageId?
  @Published private(set) var hasUnseenNewMessages = false
  @Published private(set) var isSendingReaction = false
  @Published private(set) var localMessageStateById: [ChatMessageId: ChatLocalMessageState] = [:]
  @Published private(set) var uploadProgressByAttachmentId: [UUID: Double] = [:]
  @Published private(set) var composerError: String?
  @Published private(set) var replyingTo: ChatMessage?
  @Published private(set) var composerMode: ChatComposerMode = .composing

  let thread: ChatThreadPreview
  let currentUserId: String

  private let apiClient: APIClient
  private let realtimeClient: ChatRealtimeClientProtocol
  private var nextCursor: String?
  private var isNearBottom = true
  private var typingExpiryTask: Task<Void, Never>?
  private var highlightTask: Task<Void, Never>?
  private var typingFalseTask: Task<Void, Never>?
  private var readDispatchTask: Task<Void, Never>?
  private var latestReadMessageIdSent: ChatMessageId?
  private var lastTypingTrueSentAt: Date?
  private var isScreenVisible = false
  private var isAppActive = true
  private let pageLimit = 50

  init(thread: ChatThreadPreview, apiClient: APIClient, currentUserId: String) {
    self.thread = thread
    self.apiClient = apiClient
    self.currentUserId = currentUserId
    if AppConstants.ablyAPIKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      realtimeClient = NoopChatRealtimeClient()
    } else {
      realtimeClient = AblyChatRealtimeClient(
        apiKey: AppConstants.ablyAPIKey,
        currentUserId: currentUserId
      )
    }
  }

  deinit {
    typingExpiryTask?.cancel()
    highlightTask?.cancel()
    typingFalseTask?.cancel()
    readDispatchTask?.cancel()
  }

  func start() async {
    isScreenVisible = true
    startRealtime()
    await loadInitial()
    scheduleReadDispatchForNewestVisibleMessage()
  }

  func stop() {
    isScreenVisible = false
    typingFalseTask?.cancel()
    readDispatchTask?.cancel()
    Task { await setTyping(false, force: true) }
    realtimeClient.unsubscribeFromThread()
    realtimeClient.disconnect()
  }

  func setForegroundActive(_ active: Bool) {
    isAppActive = active
    if !active {
      typingFalseTask?.cancel()
      readDispatchTask?.cancel()
      Task { await setTyping(false, force: true) }
    } else {
      scheduleReadDispatchForNewestVisibleMessage()
    }
  }

  func loadInitial() async {
    guard !isLoadingInitial else { return }
    isLoadingInitial = true
    error = nil
    hasMore = true
    nextCursor = nil

    do {
      let page = try await apiClient.getChatMessages(threadId: thread.id, before: nil, limit: pageLimit)
      messages = sortedUnique(page.items)
      nextCursor = page.nextCursor
      hasMore = page.hasMore
      await refreshReadReceipts()
    } catch {
      self.error = messageError(for: error)
      hasMore = false
    }

    isLoadingInitial = false
  }

  func loadOlderIfNeeded(currentMessageId: ChatMessageId) async {
    guard currentMessageId == messages.first?.id else { return }
    await loadOlder()
  }

  func loadOlder() async {
    guard !isLoadingOlder, !isLoadingInitial, hasMore, let before = messages.first?.id else {
      return
    }

    isLoadingOlder = true
    error = nil

    do {
      let page = try await apiClient.getChatMessages(threadId: thread.id, before: before, limit: pageLimit)
      merge(page.items)
      nextCursor = page.nextCursor
      hasMore = page.hasMore
    } catch {
      self.error = messageError(for: error)
    }

    isLoadingOlder = false
  }

  func refreshAfterReconnect() async {
    do {
      let page = try await apiClient.getChatMessages(threadId: thread.id, before: nil, limit: pageLimit)
      merge(page.items)
      nextCursor = page.nextCursor
      hasMore = page.hasMore || hasMore
      await refreshReadReceipts()
    } catch {
      self.error = messageError(for: error)
    }
  }

  func refreshReadReceipts() async {
    do {
      let response = try await apiClient.getChatReadReceipts(threadId: thread.id)
      readReceipts = response.items.filter { $0.userId != currentUserId }
    } catch {
      self.error = messageError(for: error)
    }
  }

  func setNearBottom(_ value: Bool) {
    isNearBottom = value
    if value {
      hasUnseenNewMessages = false
      scheduleReadDispatchForNewestVisibleMessage()
    }
  }

  func shouldAutoScrollToBottom() -> Bool {
    isNearBottom
  }

  func clearUnseenMessages() {
    hasUnseenNewMessages = false
  }

  func retry() async {
    await loadInitial()
  }

  func clearError() {
    error = nil
    composerError = nil
  }

  func setReplyingTo(_ message: ChatMessage?) {
    guard composerMode == .composing else { return }
    replyingTo = message
  }

  func beginEditing(_ message: ChatMessage) {
    guard message.senderId == currentUserId, message.contentType == .text, !message.isDeleted else {
      return
    }
    replyingTo = nil
    composerMode = .editing(message)
  }

  func cancelEditing() {
    composerMode = .composing
  }

  func composerTextDidChange(_ value: String) {
    guard !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      typingFalseTask?.cancel()
      Task { await setTyping(false, force: true) }
      return
    }

    Task { await setTyping(true, force: false) }
    typingFalseTask?.cancel()
    typingFalseTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 3_000_000_000)
      guard !Task.isCancelled else { return }
      await self?.setTyping(false, force: true)
    }
  }

  func send(body: String, attachment: ChatStagedAttachment?) async -> Bool {
    let trimmedBody = body.trimmingCharacters(in: .whitespacesAndNewlines)
    guard trimmedBody.count <= 4000 else {
      composerError = "Message is over 4000 characters."
      return false
    }

    switch composerMode {
    case .editing(let message):
      return await edit(message: message, body: trimmedBody)
    case .composing:
      return await sendNewMessage(body: trimmedBody, attachment: attachment, replyToId: replyingTo?.id)
    }
  }

  func retry(messageId: ChatMessageId) async {
    guard
      let failedMessage = messages.first(where: { $0.id == messageId }),
      case .failed = localMessageStateById[messageId]
    else {
      return
    }

    localMessageStateById[messageId] = .sending
    do {
      let sent = try await apiClient.sendChatMessage(
        threadId: thread.id,
        input: SendChatMessageRequest(
          contentType: failedMessage.contentType,
          body: failedMessage.body,
          mediaUrl: failedMessage.mediaUrl,
          mediaMetadata: failedMessage.mediaMetadata,
          linkPreview: failedMessage.linkPreview,
          replyToId: failedMessage.replyToId
        )
      )
      replaceMessage(id: messageId, with: sent)
    } catch {
      localMessageStateById[messageId] = .failed(messageError(for: error))
    }
  }

  func delete(message: ChatMessage) async {
    guard message.senderId == currentUserId, !message.isDeleted else { return }
    let previous = message
    let deleted = deletedCopy(of: message)
    upsert(deleted)

    do {
      try await apiClient.deleteChatMessage(messageId: message.id, threadId: thread.id)
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    } catch {
      upsert(previous)
      self.error = messageError(for: error)
    }
  }

  func markVisible(message: ChatMessage) {
    guard message.id == messages.last?.id else { return }
    setNearBottom(true)
  }

  func toggleReaction(message: ChatMessage, emoji: String) async {
    guard !message.isDeleted, !isSendingReaction else { return }
    isSendingReaction = true
    error = nil

    do {
      let updated: ChatMessage
      if message.reactions.first(where: { $0.emoji == emoji })?.viewerReacted == true {
        updated = try await apiClient.deleteChatReaction(
          messageId: message.id,
          threadId: thread.id,
          emoji: emoji
        )
      } else {
        updated = try await apiClient.addChatReaction(
          messageId: message.id,
          threadId: thread.id,
          emoji: emoji
        )
      }
      upsert(updated)
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
    } catch {
      self.error = messageError(for: error)
    }

    isSendingReaction = false
  }

  func highlightMessage(id: ChatMessageId?) -> Bool {
    guard let id, messages.contains(where: { $0.id == id }) else {
      return false
    }

    highlightedMessageId = id
    highlightTask?.cancel()
    highlightTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 1_200_000_000)
      guard !Task.isCancelled else { return }
      self?.highlightedMessageId = nil
    }
    return true
  }

  func isFirstInRun(message: ChatMessage) -> Bool {
    guard let index = messages.firstIndex(where: { $0.id == message.id }), index > 0 else {
      return true
    }
    let previous = messages[index - 1]
    return previous.senderId != message.senderId
      || message.createdAt.timeIntervalSince(previous.createdAt) > 5 * 60
      || !Calendar.current.isDate(previous.createdAt, inSameDayAs: message.createdAt)
  }

  func shouldShowDateSeparator(before message: ChatMessage) -> Bool {
    guard let index = messages.firstIndex(where: { $0.id == message.id }), index > 0 else {
      return true
    }
    return !Calendar.current.isDate(messages[index - 1].createdAt, inSameDayAs: message.createdAt)
  }

  func readReceiptSummary(for message: ChatMessage) -> String? {
    guard message.senderId == currentUserId, !readReceipts.isEmpty else { return nil }
    let messageIndexById = Dictionary(uniqueKeysWithValues: messages.enumerated().map { ($0.element.id, $0.offset) })
    guard let currentIndex = messageIndexById[message.id] else { return nil }

    let readIndexes = readReceipts.compactMap { messageIndexById[$0.lastReadMessageId] }
    guard let furthestReadIndex = readIndexes.max(), currentIndex <= furthestReadIndex else {
      return nil
    }

    let latestOwnReadIndex = messages.enumerated()
      .filter { $0.element.senderId == currentUserId && $0.offset <= furthestReadIndex }
      .map(\.offset)
      .max()
    guard latestOwnReadIndex == currentIndex else { return nil }

    let count = Set(readReceipts.compactMap { receipt -> String? in
      guard let index = messageIndexById[receipt.lastReadMessageId], index >= currentIndex else {
        return nil
      }
      return receipt.userId
    }).count

    guard count > 0 else { return nil }
    return thread.type == .dm ? "Seen" : "Seen by \(count)"
  }

  private func startRealtime() {
    realtimeClient.connect()
    realtimeClient.subscribeToThread(threadId: thread.id) { [weak self] event in
      self?.handleRealtime(event)
    }
  }

  private func handleRealtime(_ event: ChatRealtimeEvent) {
    switch event {
    case .messageNew(let message):
      guard message.threadId == thread.id else { return }
      clearTyping(userId: message.senderId)
      upsert(message)
      if message.senderId != currentUserId {
        scheduleReadDispatchForNewestVisibleMessage()
      }
      if !isNearBottom {
        hasUnseenNewMessages = true
      }
    case .messageEdited(let message), .messageDeleted(let message), .messageReaction(let message):
      guard message.threadId == thread.id else { return }
      upsert(message)
    case .messageRead(let payload):
      guard payload.threadId == thread.id, payload.userId != currentUserId else { return }
      updateReadReceipt(payload)
    case .typingUpdate(let payload):
      guard payload.threadId == thread.id, payload.userId != currentUserId else { return }
      if payload.isTyping {
        typingUsers.removeAll { $0.userId == payload.userId }
        typingUsers.append(ChatThreadTypingUser(
          userId: payload.userId,
          username: payload.username,
          avatarUrl: payload.avatarUrl,
          expiresAt: Date().addingTimeInterval(4)
        ))
        scheduleTypingExpiry()
      } else {
        clearTyping(userId: payload.userId)
      }
    case .reconnectNeeded, .inboxInvalidated:
      Task { await refreshAfterReconnect() }
    case .threadUpdated:
      break
    }
  }

  private func updateReadReceipt(_ payload: ChatReadRealtimePayload) {
    guard let userId = payload.userId else { return }
    let username = payload.username ?? readReceipts.first(where: { $0.userId == userId })?.username ?? "Someone"
    let receipt = ChatReadReceipt(
      userId: userId,
      username: username,
      lastReadMessageId: payload.lastReadMessageId
    )
    if let index = readReceipts.firstIndex(where: { $0.userId == userId }) {
      readReceipts[index] = receipt
    } else {
      readReceipts.append(receipt)
    }
  }

  private func upsert(_ message: ChatMessage) {
    if let index = messages.firstIndex(where: { $0.id == message.id }) {
      messages[index] = message
    } else {
      messages.append(message)
    }
    sortMessages()
  }

  private func merge(_ incoming: [ChatMessage]) {
    for message in incoming {
      if let index = messages.firstIndex(where: { $0.id == message.id }) {
        messages[index] = message
      } else {
        messages.append(message)
      }
    }
    sortMessages()
  }

  private func replaceMessage(id: ChatMessageId, with message: ChatMessage) {
    messages.removeAll { $0.id == id }
    localMessageStateById.removeValue(forKey: id)
    upsert(message)
    scheduleReadDispatchForNewestVisibleMessage()
  }

  private func sortedUnique(_ incoming: [ChatMessage]) -> [ChatMessage] {
    var byId: [ChatMessageId: ChatMessage] = [:]
    for message in incoming {
      byId[message.id] = message
    }
    return byId.values.sorted(by: Self.messageAscending)
  }

  private func sortMessages() {
    messages = sortedUnique(messages)
  }

  private static func messageAscending(lhs: ChatMessage, rhs: ChatMessage) -> Bool {
    if lhs.createdAt != rhs.createdAt {
      return lhs.createdAt < rhs.createdAt
    }
    return lhs.id < rhs.id
  }

  private func clearTyping(userId: String) {
    typingUsers.removeAll { $0.userId == userId }
  }

  private func scheduleTypingExpiry() {
    typingExpiryTask?.cancel()
    typingExpiryTask = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        guard !Task.isCancelled else { return }
        let now = Date()
        self?.typingUsers = self?.typingUsers.filter { $0.expiresAt > now } ?? []
      }
    }
  }

  private func messageError(for error: Error) -> String {
    if case APIError.keyspacesUnavailable = error {
      return "Messages temporarily unavailable."
    }
    return error.localizedDescription
  }

  private func sendNewMessage(
    body: String,
    attachment: ChatStagedAttachment?,
    replyToId: ChatMessageId?
  ) async -> Bool {
    guard !body.isEmpty || attachment != nil else { return false }
    if let attachment, attachment.exceedsImageLimit {
      composerError = "Image exceeds 12MB limit."
      return false
    }

    composerError = nil
    let tempId = "local-\(UUID().uuidString)"
    let optimistic = optimisticMessage(
      id: tempId,
      contentType: attachment?.contentTypeForMessage ?? .text,
      body: optimisticBody(body: body, attachment: attachment),
      mediaUrl: attachment.flatMap { localPreviewURL(for: $0) },
      mediaMetadata: attachment.map(mediaMetadata(for:)),
      replyToId: replyToId,
      replySnapshot: replySnapshot(for: replyToId)
    )
    upsert(optimistic)
    localMessageStateById[tempId] = .sending
    replyingTo = nil
    Task { await setTyping(false, force: true) }

    do {
      let uploadedAttachment = try await upload(attachment: attachment)
      let sent = try await apiClient.sendChatMessage(
        threadId: thread.id,
        input: SendChatMessageRequest(
          contentType: uploadedAttachment?.contentType ?? .text,
          body: sendBody(body: body, attachment: attachment),
          mediaUrl: uploadedAttachment?.mediaUrl,
          mediaMetadata: uploadedAttachment?.metadata,
          linkPreview: nil,
          replyToId: replyToId
        )
      )
      replaceMessage(id: tempId, with: sent)
      return true
    } catch {
      localMessageStateById[tempId] = .failed(messageError(for: error))
      return false
    }
  }

  private func edit(message: ChatMessage, body: String) async -> Bool {
    guard message.senderId == currentUserId, message.contentType == .text, !body.isEmpty else {
      composerError = "Edited message cannot be empty."
      return false
    }
    guard body.count <= 4000 else {
      composerError = "Message is over 4000 characters."
      return false
    }

    composerError = nil
    do {
      let updated = try await apiClient.editChatMessage(
        messageId: message.id,
        threadId: thread.id,
        body: body
      )
      upsert(updated)
      composerMode = .composing
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
      return true
    } catch {
      composerError = messageError(for: error)
      return false
    }
  }

  private func upload(attachment: ChatStagedAttachment?) async throws -> UploadedChatAttachment? {
    guard let attachment else { return nil }
    uploadProgressByAttachmentId[attachment.id] = 0
    let presign = try await apiClient.presignPostMediaUpload(
      contentType: attachment.contentType,
      contentLength: attachment.byteCount
    )
    try await ChatPresignedMediaUploader.upload(data: attachment.data, to: presign) { [weak self] progress in
      self?.uploadProgressByAttachmentId[attachment.id] = progress
    }
    uploadProgressByAttachmentId.removeValue(forKey: attachment.id)

    return UploadedChatAttachment(
      contentType: attachment.contentTypeForMessage,
      mediaUrl: presign.publicUrl,
      metadata: mediaMetadata(for: attachment)
    )
  }

  private func setTyping(_ isTyping: Bool, force: Bool) async {
    guard isScreenVisible, isAppActive else { return }
    if isTyping && !force {
      let now = Date()
      if let lastTypingTrueSentAt, now.timeIntervalSince(lastTypingTrueSentAt) < 2.5 {
        return
      }
      lastTypingTrueSentAt = now
    }

    do {
      try await apiClient.setChatTyping(threadId: thread.id, isTyping: isTyping)
    } catch {
      return
    }
  }

  private func scheduleReadDispatchForNewestVisibleMessage() {
    guard isScreenVisible, isAppActive, isNearBottom, let newest = messages.last else { return }
    guard newest.id != latestReadMessageIdSent else { return }

    readDispatchTask?.cancel()
    readDispatchTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 800_000_000)
      guard !Task.isCancelled else { return }
      await self?.dispatchRead(messageId: newest.id)
    }
  }

  private func dispatchRead(messageId: ChatMessageId) async {
    guard isScreenVisible, isAppActive, isNearBottom, messageId != latestReadMessageIdSent else { return }
    do {
      try await apiClient.markChatThreadRead(threadId: thread.id, lastReadMessageId: messageId)
      latestReadMessageIdSent = messageId
    } catch {
      return
    }
  }

  private func optimisticMessage(
    id: ChatMessageId,
    contentType: ChatMessageContentType,
    body: String?,
    mediaUrl: String?,
    mediaMetadata: ChatMediaMetadata?,
    replyToId: ChatMessageId?,
    replySnapshot: MessageReplySnapshot?
  ) -> ChatMessage {
    ChatMessage(
      id: id,
      threadId: thread.id,
      bucket: Self.currentBucket(),
      senderId: currentUserId,
      senderUsername: "you",
      senderDisplayName: "You",
      senderAvatarUrl: nil,
      senderAvatarVariants: nil,
      contentType: contentType,
      body: body,
      mediaUrl: mediaUrl,
      mediaMetadata: mediaMetadata,
      linkPreview: nil,
      replyToId: replyToId,
      replySnapshot: replySnapshot,
      reactions: [],
      isDeleted: false,
      editedAt: nil,
      createdAt: Date()
    )
  }

  private func deletedCopy(of message: ChatMessage) -> ChatMessage {
    ChatMessage(
      id: message.id,
      threadId: message.threadId,
      bucket: message.bucket,
      senderId: message.senderId,
      senderUsername: message.senderUsername,
      senderDisplayName: message.senderDisplayName,
      senderAvatarUrl: message.senderAvatarUrl,
      senderAvatarVariants: message.senderAvatarVariants,
      contentType: message.contentType,
      body: nil,
      mediaUrl: nil,
      mediaMetadata: nil,
      linkPreview: nil,
      replyToId: message.replyToId,
      replySnapshot: message.replySnapshot,
      reactions: [],
      isDeleted: true,
      editedAt: message.editedAt,
      createdAt: message.createdAt
    )
  }

  private func replySnapshot(for messageId: ChatMessageId?) -> MessageReplySnapshot? {
    guard let messageId, let message = messages.first(where: { $0.id == messageId }) else {
      return nil
    }
    return MessageReplySnapshot(
      senderId: message.senderId,
      senderUsername: message.senderUsername,
      body: message.body,
      contentType: message.contentType
    )
  }

  private func optimisticBody(body: String, attachment: ChatStagedAttachment?) -> String? {
    if !body.isEmpty { return body }
    if attachment?.kind == .file { return attachment?.filename ?? "File" }
    return nil
  }

  private func sendBody(body: String, attachment: ChatStagedAttachment?) -> String? {
    if !body.isEmpty { return body }
    if attachment?.kind == .file { return attachment?.filename ?? "File" }
    return nil
  }

  private func mediaMetadata(for attachment: ChatStagedAttachment) -> ChatMediaMetadata {
    ChatMediaMetadata(
      width: attachment.imageSize.map { Int($0.width) },
      height: attachment.imageSize.map { Int($0.height) },
      size: attachment.byteCount,
      mimeType: attachment.contentType,
      blurhash: nil
    )
  }

  private func localPreviewURL(for attachment: ChatStagedAttachment) -> String? {
    guard attachment.kind == .image else { return nil }
    let baseURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
    guard let baseURL else { return nil }
    let url = baseURL.appendingPathComponent("chat-\(attachment.id.uuidString).\(localPreviewFileExtension(for: attachment.contentType))")
    do {
      try attachment.data.write(to: url, options: [.atomic])
      return url.absoluteString
    } catch {
      return nil
    }
  }

  private func localPreviewFileExtension(for contentType: String) -> String {
    switch contentType.lowercased() {
    case "image/png":
      return "png"
    case "image/gif":
      return "gif"
    case "image/webp":
      return "webp"
    case "image/heic":
      return "heic"
    case "image/heif":
      return "heif"
    default:
      return "jpg"
    }
  }

  private static func currentBucket() -> Int {
    let components = Calendar(identifier: .gregorian).dateComponents(
      in: TimeZone(secondsFromGMT: 0) ?? .current,
      from: Date()
    )
    return (components.year ?? 1970) * 100 + (components.month ?? 1)
  }
}

private struct UploadedChatAttachment {
  let contentType: ChatMessageContentType
  let mediaUrl: String
  let metadata: ChatMediaMetadata
}
