import Foundation

enum NotificationFilter: String, CaseIterable, Identifiable {
  case all
  case unread

  var id: String { rawValue }

  var title: String {
    switch self {
    case .all:
      return "All"
    case .unread:
      return "Unread"
    }
  }

  var unreadOnly: Bool {
    self == .unread
  }
}

@MainActor
final class NotificationsViewModel: ObservableObject {
  @Published private(set) var items: [NotificationItem] = []
  @Published private(set) var followRequests: [FollowRequest] = []
  @Published private(set) var followRequestTotal = 0
  @Published private(set) var isLoadingInitial = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var isRefreshing = false
  @Published private(set) var error: String?
  @Published var filter: NotificationFilter = .all

  private let apiClient: APIClient
  private let pageLimit = 24
  private let followRequestLimit = 8
  private var nextCursor: String?
  private var hasMore = true

  var unreadCount: Int {
    items.filter { !$0.isRead }.count
  }

  var hasUnread: Bool {
    items.contains { !$0.isRead }
  }

  init(apiClient: APIClient) {
    self.apiClient = apiClient
  }

  func loadInitial() async {
    guard !isLoadingInitial else { return }

    isLoadingInitial = true
    error = nil
    nextCursor = nil
    hasMore = true

    do {
      let notificationPage: NotificationPage = try await apiClient.request(
        .getNotifications(cursor: nil, limit: pageLimit, unreadOnly: filter.unreadOnly)
      )
      let requestPage: FollowRequestPage = try await apiClient.request(
        .getFollowRequests(cursor: nil, limit: followRequestLimit)
      )
      items = notificationPage.items
      nextCursor = notificationPage.nextCursor
      hasMore = notificationPage.hasMore
      followRequests = requestPage.requests
      followRequestTotal = requestPage.total
    } catch {
      self.error = error.localizedDescription
      hasMore = false
    }

    isLoadingInitial = false
  }

  func refresh() async {
    guard !isRefreshing else { return }

    isRefreshing = true
    error = nil

    do {
      let notificationPage: NotificationPage = try await apiClient.request(
        .getNotifications(cursor: nil, limit: pageLimit, unreadOnly: filter.unreadOnly)
      )
      let requestPage: FollowRequestPage = try await apiClient.request(
        .getFollowRequests(cursor: nil, limit: followRequestLimit)
      )
      items = notificationPage.items
      nextCursor = notificationPage.nextCursor
      hasMore = notificationPage.hasMore
      followRequests = requestPage.requests
      followRequestTotal = requestPage.total
    } catch {
      self.error = error.localizedDescription
    }

    isRefreshing = false
  }

  func loadMoreIfNeeded(currentItemId: String) async {
    guard items.last?.id == currentItemId else { return }
    await loadMore()
  }

  func loadMore() async {
    guard !isLoadingMore, !isLoadingInitial, hasMore else { return }

    isLoadingMore = true
    error = nil

    do {
      let page: NotificationPage = try await apiClient.request(
        .getNotifications(cursor: nextCursor, limit: pageLimit, unreadOnly: filter.unreadOnly)
      )
      appendDeduped(page.items)
      nextCursor = page.nextCursor
      hasMore = page.hasMore
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  func setFilter(_ nextFilter: NotificationFilter) async {
    guard filter != nextFilter else { return }

    filter = nextFilter
    await loadInitial()
  }

  func markReadOnOpen(_ item: NotificationItem) async {
    guard !item.isRead else { return }
    await setRead(true, item: item)
  }

  func toggleRead(_ item: NotificationItem) async {
    await setRead(!item.isRead, item: item)
  }

  func markAllRead() async {
    guard hasUnread else { return }

    let previousItems = items
    items = items.map { $0.withReadState(true) }
    error = nil

    do {
      try await apiClient.requestVoid(.markAllNotificationsRead())
      if filter == .unread {
        items = []
      }
    } catch {
      items = previousItems
      self.error = error.localizedDescription
    }
  }

  func acceptFollowRequest(_ request: FollowRequest) async {
    await resolveFollowRequest(request, endpoint: .acceptFollowRequest(request.requesterId))
  }

  func declineFollowRequest(_ request: FollowRequest) async {
    await resolveFollowRequest(request, endpoint: .declineFollowRequest(request.requesterId))
  }

  func clearError() {
    error = nil
  }

  func showError(_ message: String) {
    error = message
  }

  private func setRead(_ isRead: Bool, item: NotificationItem) async {
    guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }

    let original = items[index]
    if filter == .unread && isRead {
      items.remove(at: index)
    } else {
      items[index] = original.withReadState(isRead)
    }
    error = nil

    do {
      try await apiClient.requestVoid(
        isRead ? .markNotificationRead(item.id) : .markNotificationUnread(item.id)
      )
    } catch {
      if filter == .unread && isRead {
        items.insert(original, at: min(index, items.count))
      } else if let currentIndex = items.firstIndex(where: { $0.id == item.id }) {
        items[currentIndex] = original
      }
      self.error = error.localizedDescription
    }
  }

  private func resolveFollowRequest(_ request: FollowRequest, endpoint: APIEndpoint) async {
    let originalRequests = followRequests
    let originalTotal = followRequestTotal
    followRequests.removeAll { $0.id == request.id }
    followRequestTotal = max(followRequestTotal - 1, 0)
    error = nil

    do {
      try await apiClient.requestVoid(endpoint)
    } catch {
      followRequests = originalRequests
      followRequestTotal = originalTotal
      self.error = error.localizedDescription
    }
  }

  private func appendDeduped(_ newItems: [NotificationItem]) {
    var seen = Set(items.map(\.id))
    let filtered = newItems.filter { seen.insert($0.id).inserted }
    items.append(contentsOf: filtered)
  }
}
