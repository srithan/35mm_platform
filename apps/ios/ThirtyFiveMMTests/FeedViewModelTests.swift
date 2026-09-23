import Foundation
import Testing
@testable import ThirtyFiveMM

@MainActor
struct FeedViewModelTests {
  @Test
  func refreshKeepsAlreadyLoadedRowsWhenFirstPageIsShort() async throws {
    let service = FeedServiceStub()
    let first = try makePost(id: "post-1", body: "First")
    let second = try makePost(id: "post-2", body: "Second")
    let third = try makePost(id: "post-3", body: "Third")
    service.pages[nil] = PaginatedResponse(
      items: [first, second],
      nextCursor: "cursor-1",
      hasMore: true
    )
    service.pages["cursor-1"] = PaginatedResponse(
      items: [third],
      nextCursor: "cursor-2",
      hasMore: true
    )
    let viewModel = FeedViewModel(service: service)

    await viewModel.loadInitial()
    await viewModel.loadMore()
    service.pages[nil] = PaginatedResponse(
      items: [first],
      nextCursor: "cursor-refresh",
      hasMore: true
    )
    await viewModel.refresh()

    #expect(viewModel.posts.map(\.id) == ["post-1", "post-2", "post-3"])
    #expect(viewModel.hasMore)
    #expect(service.feedRequests.map(\.cursor) == [nil, "cursor-1", nil])
  }

  @Test
  func refreshMergesUpdatedFirstPageRowsOverCachedRows() async throws {
    let service = FeedServiceStub()
    let original = try makePost(id: "post-1", body: "Original", likeCount: 1, isLiked: false)
    let second = try makePost(id: "post-2", body: "Second")
    let updated = try makePost(id: "post-1", body: "Original", likeCount: 4, isLiked: true)
    service.pages[nil] = PaginatedResponse(
      items: [original, second],
      nextCursor: "cursor-1",
      hasMore: true
    )
    let viewModel = FeedViewModel(service: service)

    await viewModel.loadInitial()
    service.pages[nil] = PaginatedResponse(
      items: [updated],
      nextCursor: "cursor-refresh",
      hasMore: true
    )
    await viewModel.refresh()

    #expect(viewModel.posts.map(\.id) == ["post-1", "post-2"])
    #expect(viewModel.posts.first?.likeCount == 4)
    #expect(viewModel.posts.first?.isLiked == true)
  }

  @Test
  func diffablePlanReconfiguresChangedRowsWithoutChangingIdentity() async throws {
    let original = try makePost(id: "post-1", body: "Original", likeCount: 1, isLiked: false)
    let unchanged = try makePost(id: "post-2", body: "Second")
    let updated = try makePost(id: "post-1", body: "Original", likeCount: 2, isLiked: true)

    let plan = FeedDiffableUpdatePlan(
      previous: [original, unchanged],
      current: [updated, unchanged]
    )

    #expect(plan.canReconfigureInPlace)
    #expect(plan.reconfigureIDs == ["post-1"])
  }

  @Test
  func diffablePlanDoesNotReconfigureWhenIdentitySetChanges() async throws {
    let original = try makePost(id: "post-1", body: "Original")
    let replacement = try makePost(id: "post-2", body: "Second")

    let plan = FeedDiffableUpdatePlan(previous: [original], current: [replacement])

    #expect(!plan.canReconfigureInPlace)
    #expect(plan.reconfigureIDs.isEmpty)
  }

  @Test
  func paginationTriggerStartsFiveRowsBeforeEnd() {
    #expect(!FeedPaginationTrigger.shouldLoadMore(visibleIndex: 14, itemCount: 20))
    #expect(FeedPaginationTrigger.shouldLoadMore(visibleIndex: 15, itemCount: 20))
    #expect(FeedPaginationTrigger.shouldLoadMore(visibleIndex: 19, itemCount: 20))
    #expect(!FeedPaginationTrigger.shouldLoadMore(visibleIndex: 0, itemCount: 0))
  }

  private func makePost(
    id: String,
    body: String,
    likeCount: Int = 0,
    isLiked: Bool = false
  ) throws -> FeedPost {
    let payload: [String: Any] = [
      "id": id,
      "type": "text",
      "body": body,
      "createdAt": "2026-07-17T12:00:00Z",
      "visibility": "public",
      "likeCount": likeCount,
      "isLiked": isLiked,
      "author": [
        "id": "user-1",
        "username": "maya.frames",
        "displayName": "Maya Frames",
      ],
    ]
    let data = try JSONSerialization.data(withJSONObject: payload)
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return try decoder.decode(FeedPost.self, from: data)
  }
}

@MainActor
private final class FeedServiceStub: FeedServicing {
  struct FeedRequest {
    let cursor: String?
    let limit: Int
  }

  var pages: [String?: PaginatedResponse<FeedPost>] = [:]
  var feedRequests: [FeedRequest] = []

  func fetchFeed(cursor: String?, limit: Int) async throws -> PaginatedResponse<FeedPost> {
    feedRequests.append(FeedRequest(cursor: cursor, limit: limit))
    return pages[cursor] ?? PaginatedResponse(items: [], nextCursor: nil, hasMore: false)
  }

  func performPostInteraction(_ endpoint: APIEndpoint) async throws {}

  func votePoll(postId: String, optionIds: [String]) async throws {}
}
