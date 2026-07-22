import Foundation
import Testing
@testable import ThirtyFiveMM

@MainActor
struct FollowRequestsViewModelTests {
  @Test
  func initialAndNextPagesUseCursorAndDeduplicateRequests() async {
    let service = FollowRequestServiceStub()
    let first = makeRequest(id: "user-1")
    let second = makeRequest(id: "user-2")
    service.pages[service.key(for: nil)] = FollowRequestPage(
      requests: [first],
      total: 2,
      hasMore: true,
      nextCursor: "cursor-1"
    )
    service.pages[service.key(for: "cursor-1")] = FollowRequestPage(
      requests: [first, second],
      total: 2,
      hasMore: false,
      nextCursor: nil
    )
    let viewModel = FollowRequestsViewModel(service: service, pageLimit: 1)

    await viewModel.loadInitial()
    await viewModel.loadMore()

    #expect(viewModel.requests.map(\.id) == ["user-1", "user-2"])
    #expect(viewModel.total == 2)
    #expect(!viewModel.hasMore)
    #expect(service.fetches.map(\.cursor) == [nil, "cursor-1"])
    #expect(service.fetches.allSatisfy { $0.limit == 1 })
  }

  @Test
  func acceptingRequestRemovesItAndUpdatesDenormalizedTotal() async {
    let service = FollowRequestServiceStub()
    let request = makeRequest(id: "user-1")
    service.pages[service.key(for: nil)] = FollowRequestPage(
      requests: [request],
      total: 1,
      hasMore: false,
      nextCursor: nil
    )
    let viewModel = FollowRequestsViewModel(service: service)
    await viewModel.loadInitial()

    let didAccept = await viewModel.accept(request)

    #expect(didAccept)
    #expect(viewModel.requests.isEmpty)
    #expect(viewModel.total == 0)
    #expect(service.acceptedIDs == ["user-1"])
  }

  @Test
  func failedDeclineRestoresOptimisticRequestAndTotal() async {
    let service = FollowRequestServiceStub()
    let request = makeRequest(id: "user-1")
    service.pages[service.key(for: nil)] = FollowRequestPage(
      requests: [request],
      total: 1,
      hasMore: false,
      nextCursor: nil
    )
    service.declineError = FollowRequestTestError.expected
    let viewModel = FollowRequestsViewModel(service: service)
    await viewModel.loadInitial()

    let didDecline = await viewModel.decline(request)

    #expect(!didDecline)
    #expect(viewModel.requests.map(\.id) == ["user-1"])
    #expect(viewModel.total == 1)
    #expect(viewModel.error != nil)
    #expect(viewModel.pendingRequestIDs.isEmpty)
  }

  private func makeRequest(id: String) -> FollowRequest {
    FollowRequest(
      requesterId: id,
      username: id,
      displayName: "Viewer \(id)",
      avatarUrl: nil,
      avatarUrlLg: nil,
      mutualFollowerCount: 0,
      requestedAt: .distantPast
    )
  }
}

@MainActor
private final class FollowRequestServiceStub: FollowRequestServicing {
  struct Fetch {
    let cursor: String?
    let limit: Int
  }

  var pages: [String: FollowRequestPage] = [:]
  var fetches: [Fetch] = []
  var acceptedIDs: [String] = []
  var declinedIDs: [String] = []
  var acceptError: Error?
  var declineError: Error?

  func key(for cursor: String?) -> String {
    cursor ?? "initial"
  }

  func fetchFollowRequests(cursor: String?, limit: Int) async throws -> FollowRequestPage {
    fetches.append(Fetch(cursor: cursor, limit: limit))
    guard let page = pages[key(for: cursor)] else {
      throw FollowRequestTestError.missingPage
    }
    return page
  }

  func acceptFollowRequest(requesterId: String) async throws {
    if let acceptError { throw acceptError }
    acceptedIDs.append(requesterId)
  }

  func declineFollowRequest(requesterId: String) async throws {
    if let declineError { throw declineError }
    declinedIDs.append(requesterId)
  }
}

private enum FollowRequestTestError: Error {
  case expected
  case missingPage
}
