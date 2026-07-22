import Foundation

@MainActor
final class FollowRequestsViewModel: ObservableObject {
  @Published private(set) var requests: [FollowRequest] = []
  @Published private(set) var total = 0
  @Published private(set) var isLoadingInitial = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var pendingRequestIDs: Set<String> = []
  @Published private(set) var error: String?
  @Published private(set) var hasMore = true

  private let service: any FollowRequestServicing
  private let pageLimit: Int
  private var nextCursor: String?
  private var activeLoadID = UUID()

  init(service: any FollowRequestServicing, pageLimit: Int = 24) {
    self.service = service
    self.pageLimit = pageLimit
  }

  func loadInitial() async {
    let loadID = UUID()
    activeLoadID = loadID
    isLoadingInitial = true
    error = nil

    do {
      let page = try await service.fetchFollowRequests(cursor: nil, limit: pageLimit)
      guard activeLoadID == loadID else { return }
      requests = page.requests
      total = page.total
      nextCursor = page.nextCursor
      hasMore = page.hasMore
    } catch {
      guard activeLoadID == loadID else { return }
      self.error = error.localizedDescription
      hasMore = false
    }

    guard activeLoadID == loadID else { return }
    isLoadingInitial = false
  }

  func refresh() async {
    await loadInitial()
  }

  func loadMoreIfNeeded(currentRequestID: String) async {
    guard requests.last?.id == currentRequestID else { return }
    await loadMore()
  }

  func loadMore() async {
    guard !isLoadingMore, !isLoadingInitial, hasMore else { return }

    isLoadingMore = true
    error = nil

    do {
      let page = try await service.fetchFollowRequests(cursor: nextCursor, limit: pageLimit)
      appendDeduped(page.requests)
      total = page.total
      nextCursor = page.nextCursor
      hasMore = page.hasMore
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  @discardableResult
  func accept(_ request: FollowRequest) async -> Bool {
    await resolve(request) {
      try await service.acceptFollowRequest(requesterId: request.requesterId)
    }
  }

  @discardableResult
  func decline(_ request: FollowRequest) async -> Bool {
    await resolve(request) {
      try await service.declineFollowRequest(requesterId: request.requesterId)
    }
  }

  func clearError() {
    error = nil
  }

  private func resolve(
    _ request: FollowRequest,
    operation: () async throws -> Void
  ) async -> Bool {
    guard !pendingRequestIDs.contains(request.id),
      let originalIndex = requests.firstIndex(where: { $0.id == request.id })
    else {
      return false
    }

    pendingRequestIDs.insert(request.id)
    requests.remove(at: originalIndex)
    total = max(total - 1, 0)
    error = nil

    do {
      try await operation()
      pendingRequestIDs.remove(request.id)
      if requests.isEmpty, hasMore {
        await loadMore()
      }
      return true
    } catch {
      requests.insert(request, at: min(originalIndex, requests.count))
      total += 1
      pendingRequestIDs.remove(request.id)
      self.error = error.localizedDescription
      return false
    }
  }

  private func appendDeduped(_ newRequests: [FollowRequest]) {
    var seen = Set(requests.map(\.id))
    requests.append(contentsOf: newRequests.filter { seen.insert($0.id).inserted })
  }
}
