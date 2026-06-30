import Foundation
import UIKit

enum ChatInboxMode {
  case inbox
  case archived
}

@MainActor
final class ChatInboxViewModel: ObservableObject {
  @Published private(set) var threads: [ChatThreadPreview] = []
  @Published private(set) var isLoadingInitial = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var isRefreshing = false
  @Published private(set) var hasMore = true
  @Published private(set) var error: String?
  @Published private(set) var onlineByUserId: [String: Bool] = [:]
  @Published private(set) var typingByThreadId: [String: ChatTypingState] = [:]
  @Published private(set) var composeResults: [ProfileSearchUser] = []
  @Published private(set) var isSearchingProfiles = false
  @Published private(set) var composeError: String?

  let currentUserId: String

  private let apiClient: APIClient
  private let realtimeClient: ChatRealtimeClientProtocol
  private var nextCursor: String?
  private var visibleThreadIds = Set<String>()
  private var presenceTask: Task<Void, Never>?
  private var typingExpiryTask: Task<Void, Never>?
  private var profileSearchTask: Task<Void, Never>?
  private let pageLimit = 20

  init(apiClient: APIClient, currentUserId: String) {
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
    presenceTask?.cancel()
    typingExpiryTask?.cancel()
    profileSearchTask?.cancel()
  }

  func filteredThreads(for mode: ChatInboxMode) -> [ChatThreadPreview] {
    switch mode {
    case .inbox:
      return threads.filter { !$0.isArchived }
    case .archived:
      return threads.filter(\.isArchived)
    }
  }

  func start() async {
    startRealtime()
    await loadInitialIfNeeded()
  }

  func stop() {
    realtimeClient.unsubscribeFromVisibleThreads()
    realtimeClient.unsubscribeFromInbox()
    realtimeClient.disconnect()
  }

  func loadInitialIfNeeded() async {
    guard threads.isEmpty else { return }
    await loadInitial()
  }

  func loadInitial() async {
    guard !isLoadingInitial else { return }
    isLoadingInitial = true
    error = nil
    nextCursor = nil
    hasMore = true

    do {
      let page = try await apiClient.getChatInbox(cursor: nil, limit: pageLimit)
      threads = sorted(page.items)
      nextCursor = page.nextCursor
      hasMore = page.hasMore
      updateVisibleSubscriptions()
    } catch {
      self.error = inboxErrorMessage(for: error)
      hasMore = false
    }

    isLoadingInitial = false
  }

  func refresh() async {
    guard !isRefreshing else { return }
    isRefreshing = true
    error = nil

    do {
      let page = try await apiClient.getChatInbox(cursor: nil, limit: pageLimit)
      threads = sorted(page.items)
      nextCursor = page.nextCursor
      hasMore = page.hasMore
      updateVisibleSubscriptions()
    } catch {
      self.error = inboxErrorMessage(for: error)
    }

    isRefreshing = false
  }

  func loadMoreIfNeeded(currentThreadId: String, mode: ChatInboxMode) async {
    let visible = filteredThreads(for: mode)
    guard currentThreadId == visible.last?.id else { return }
    await loadMore()
  }

  func loadMore() async {
    guard !isLoadingMore, !isLoadingInitial, hasMore else { return }
    isLoadingMore = true
    error = nil

    do {
      let page = try await apiClient.getChatInbox(cursor: nextCursor, limit: pageLimit)
      merge(page.items)
      nextCursor = page.nextCursor
      hasMore = page.hasMore
      updateVisibleSubscriptions()
    } catch {
      self.error = inboxErrorMessage(for: error)
    }

    isLoadingMore = false
  }

  func setVisible(threadId: String, isVisible: Bool) {
    if isVisible {
      visibleThreadIds.insert(threadId)
    } else {
      visibleThreadIds.remove(threadId)
    }
    scheduleVisibleRowStateRefresh()
  }

  func archive(_ thread: ChatThreadPreview, archived: Bool = true) async {
    await commitThreadAction {
      try await self.apiClient.archiveChatThread(threadId: thread.id, archived: archived)
      self.patchThread(thread.id) { existing in
        ChatThreadPreview(
          id: existing.id,
          type: existing.type,
          members: existing.members,
          lastMessageAt: existing.lastMessageAt,
          lastMessagePreview: existing.lastMessagePreview,
          lastSenderId: existing.lastSenderId,
          unreadCount: existing.unreadCount,
          isArchived: archived,
          isMuted: existing.isMuted,
          deletedAt: existing.deletedAt
        )
      }
    }
  }

  func toggleMute(_ thread: ChatThreadPreview) async {
    let mutedUntil = thread.isMuted ? nil : Self.isoString(Date().addingTimeInterval(8 * 60 * 60))
    await commitThreadAction {
      try await self.apiClient.muteChatThread(threadId: thread.id, mutedUntil: mutedUntil)
      self.patchThread(thread.id) { existing in
        ChatThreadPreview(
          id: existing.id,
          type: existing.type,
          members: existing.members,
          lastMessageAt: existing.lastMessageAt,
          lastMessagePreview: existing.lastMessagePreview,
          lastSenderId: existing.lastSenderId,
          unreadCount: existing.unreadCount,
          isArchived: existing.isArchived,
          isMuted: mutedUntil != nil,
          deletedAt: existing.deletedAt
        )
      }
    }
  }

  func delete(_ thread: ChatThreadPreview) async {
    await commitThreadAction {
      try await self.apiClient.deleteChatThread(threadId: thread.id)
      self.threads.removeAll { $0.id == thread.id }
    }
  }

  func clearError() {
    error = nil
  }

  func previewText(for thread: ChatThreadPreview) -> String {
    if let typing = typingByThreadId[thread.id], typing.expiresAt > Date() {
      return typing.username.map { "\($0) typing..." } ?? "typing..."
    }

    let raw = thread.lastMessagePreview?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let preview: String
    if raw.isEmpty {
      preview = "No messages yet."
    } else if raw.contains("Photo") {
      preview = "Photo"
    } else if raw.contains("File") {
      preview = "File"
    } else if raw.contains("Link") {
      preview = "Link"
    } else {
      preview = raw
    }

    guard thread.lastSenderId == currentUserId, preview != "No messages yet." else {
      return preview
    }
    return "You: \(preview)"
  }

  func isTyping(thread: ChatThreadPreview) -> Bool {
    guard let typing = typingByThreadId[thread.id] else { return false }
    return typing.expiresAt > Date()
  }

  func onlineUserId(for thread: ChatThreadPreview) -> String? {
    guard thread.type == .dm else { return nil }
    return thread.members.first?.userId
  }

  func isOnline(thread: ChatThreadPreview) -> Bool {
    guard let userId = onlineUserId(for: thread) else { return false }
    return onlineByUserId[userId] == true
  }

  func searchProfiles(query: String) {
    profileSearchTask?.cancel()
    let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
    guard trimmed.count >= 2 else {
      composeResults = []
      composeError = nil
      isSearchingProfiles = false
      return
    }

    isSearchingProfiles = true
    composeError = nil
    profileSearchTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 250_000_000)
      guard !Task.isCancelled else { return }
      do {
        let users = try await self?.apiClient.searchProfiles(query: trimmed, limit: 8) ?? []
        guard !Task.isCancelled else { return }
        self?.composeResults = users.filter { $0.id != self?.currentUserId }
        self?.isSearchingProfiles = false
      } catch {
        guard !Task.isCancelled else { return }
        self?.composeError = error.localizedDescription
        self?.isSearchingProfiles = false
      }
    }
  }

  func createDM(with user: ProfileSearchUser) async -> ChatThreadPreview? {
    composeError = nil
    do {
      let thread = try await apiClient.createChatThread(type: .dm, memberIds: [user.id])
      upsert(thread)
      return thread
    } catch {
      composeError = error.localizedDescription
      return nil
    }
  }

  private func startRealtime() {
    realtimeClient.connect()
    realtimeClient.subscribeToInbox(userId: currentUserId) { [weak self] event in
      self?.handleRealtime(event)
    }
  }

  private func handleRealtime(_ event: ChatRealtimeEvent) {
    switch event {
    case .threadUpdated(let payload):
      clearTyping(threadId: payload.threadId)
      if patchThread(payload.threadId, update: { existing in
        ChatThreadPreview(
          id: existing.id,
          type: existing.type,
          members: existing.members,
          lastMessageAt: payload.lastMessageAt ?? existing.lastMessageAt,
          lastMessagePreview: payload.lastMessagePreview ?? existing.lastMessagePreview,
          lastSenderId: payload.senderId ?? existing.lastSenderId,
          unreadCount: payload.unreadCount ?? existing.unreadCount,
          isArchived: existing.isArchived,
          isMuted: existing.isMuted,
          deletedAt: existing.deletedAt
        )
      }) {
        threads = sorted(threads)
      } else {
        Task { await refresh() }
      }
    case .typingUpdate(let payload):
      guard payload.userId != currentUserId else { return }
      if payload.isTyping {
        typingByThreadId[payload.threadId] = ChatTypingState(
          userId: payload.userId,
          username: payload.username,
          expiresAt: Date().addingTimeInterval(4)
        )
        scheduleTypingExpiry()
      } else {
        clearTyping(threadId: payload.threadId)
      }
    case .reconnectNeeded, .inboxInvalidated:
      Task { await refresh() }
    case .messageNew(let message):
      clearTyping(threadId: message.threadId)
    case .messageEdited, .messageDeleted, .messageReaction, .messageRead:
      break
    }
  }

  @discardableResult
  private func patchThread(
    _ threadId: String,
    update: (ChatThreadPreview) -> ChatThreadPreview
  ) -> Bool {
    guard let index = threads.firstIndex(where: { $0.id == threadId }) else {
      return false
    }
    threads[index] = update(threads[index])
    return true
  }

  private func upsert(_ thread: ChatThreadPreview) {
    if let index = threads.firstIndex(where: { $0.id == thread.id }) {
      threads[index] = thread
    } else {
      threads.insert(thread, at: 0)
    }
    threads = sorted(threads)
    updateVisibleSubscriptions()
  }

  private func merge(_ incoming: [ChatThreadPreview]) {
    var byId = Dictionary(uniqueKeysWithValues: threads.map { ($0.id, $0) })
    for thread in incoming {
      byId[thread.id] = thread
    }
    threads = sorted(Array(byId.values))
  }

  private func sorted(_ list: [ChatThreadPreview]) -> [ChatThreadPreview] {
    list.sorted { lhs, rhs in
      switch (lhs.lastMessageAt, rhs.lastMessageAt) {
      case let (left?, right?):
        if left == right { return lhs.id > rhs.id }
        return left > right
      case (_?, nil):
        return true
      case (nil, _?):
        return false
      case (nil, nil):
        return lhs.id > rhs.id
      }
    }
  }

  private func scheduleVisibleRowStateRefresh() {
    presenceTask?.cancel()
    presenceTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 180_000_000)
      guard !Task.isCancelled else { return }
      await self?.refreshVisiblePresence()
      self?.updateVisibleSubscriptions()
    }
  }

  private func refreshVisiblePresence() async {
    let userIds = Array(
      Set(
        threads
          .filter { visibleThreadIds.contains($0.id) }
          .compactMap(onlineUserId)
      )
    )
    guard !userIds.isEmpty else { return }

    do {
      let result = try await apiClient.getChatPresence(userIds: Array(userIds.prefix(50)))
      onlineByUserId.merge(result) { _, new in new }
    } catch {
      return
    }
  }

  private func updateVisibleSubscriptions() {
    let ids = threads
      .filter { visibleThreadIds.contains($0.id) }
      .map(\.id)
    realtimeClient.subscribeToVisibleThreads(threadIds: ids) { [weak self] event in
      self?.handleRealtime(event)
    }
  }

  private func clearTyping(threadId: String) {
    typingByThreadId.removeValue(forKey: threadId)
  }

  private func scheduleTypingExpiry() {
    typingExpiryTask?.cancel()
    typingExpiryTask = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        guard !Task.isCancelled else { return }
        let now = Date()
        self?.typingByThreadId = self?.typingByThreadId.filter { $0.value.expiresAt > now } ?? [:]
      }
    }
  }

  private func commitThreadAction(_ action: @escaping () async throws -> Void) async {
    do {
      try await action()
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    } catch {
      self.error = inboxErrorMessage(for: error)
    }
  }

  private func inboxErrorMessage(for error: Error) -> String {
    if case APIError.keyspacesUnavailable = error {
      return "Messages temporarily unavailable."
    }
    return error.localizedDescription
  }

  private static func isoString(_ date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: date)
  }
}

struct ChatTypingState: Hashable {
  let userId: String
  let username: String?
  let expiresAt: Date
}
