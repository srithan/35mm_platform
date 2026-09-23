import Foundation

enum NotificationFilter: String, CaseIterable, Identifiable, Hashable {
  case all
  case unread

  var id: String { rawValue }

  var index: Int {
    Self.allCases.firstIndex(of: self) ?? 0
  }

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

  static func dragProgress(
    from selection: NotificationFilter,
    translation: CGFloat,
    pageWidth: CGFloat,
    isRightToLeft: Bool
  ) -> Double {
    guard pageWidth > 0 else { return Double(selection.index) }
    let forwardTravel = isRightToLeft ? translation : -translation

    return min(
      max(Double(selection.index) + Double(forwardTravel / pageWidth), 0),
      Double(allCases.count - 1)
    )
  }

  static func settlingProgress(
    from selection: NotificationFilter,
    translation: CGFloat,
    predictedTranslation: CGFloat,
    pageWidth: CGFloat,
    isRightToLeft: Bool
  ) -> Double {
    guard pageWidth > 0 else { return Double(selection.index) }

    let currentProgress = dragProgress(
      from: selection,
      translation: translation,
      pageWidth: pageWidth,
      isRightToLeft: isRightToLeft
    )
    let predictedProgress = dragProgress(
      from: selection,
      translation: predictedTranslation,
      pageWidth: pageWidth,
      isRightToLeft: isRightToLeft
    )
    let target = abs(predictedProgress - Double(selection.index))
      > abs(currentProgress - Double(selection.index))
      ? predictedProgress
      : currentProgress

    return target.rounded()
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
  @Published var filter: NotificationFilter

  private let apiClient: APIClient
  private let pageLimit = 24
  private let followRequestLimit = 2
  private var hasLoadedInitial = false
  private var nextCursor: String?
  private var hasMore = true

  var unreadCount: Int {
    items.filter { !$0.isRead }.count
  }

  var hasUnread: Bool {
    items.contains { !$0.isRead }
  }

  var hasReachedEnd: Bool {
    hasLoadedInitial && !hasMore && !items.isEmpty && !isLoadingInitial && !isLoadingMore && error == nil
  }

  init(apiClient: APIClient, filter: NotificationFilter = .all) {
    self.apiClient = apiClient
    self.filter = filter
  }

  func loadInitial(force: Bool = false) async {
    guard !isLoadingInitial else { return }
    guard force || !hasLoadedInitial else { return }

    hasLoadedInitial = true
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
    await loadInitial(force: true)
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

  func refreshFollowRequests() async {
    do {
      let page: FollowRequestPage = try await apiClient.request(
        .getFollowRequests(cursor: nil, limit: followRequestLimit)
      )
      followRequests = page.requests
      followRequestTotal = page.total
    } catch {
      self.error = error.localizedDescription
    }
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

  private func appendDeduped(_ newItems: [NotificationItem]) {
    var seen = Set(items.map(\.id))
    let filtered = newItems.filter { seen.insert($0.id).inserted }
    items.append(contentsOf: filtered)
  }
}
