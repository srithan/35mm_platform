import Foundation
import Combine
import Testing
import SwiftUI
import UIKit
@testable import ThirtyFiveMM

@MainActor
struct FeedViewModelTests {
  @Test
  func coldHistoryHandoffPublishesOneInitialBatch() async throws {
    let service = FeedServiceStub()
    let first = try makePost(id: "retained", body: "Recent post")
    let history = try (0..<20).map { try makePost(id: "history-\($0)", body: "Older post") }
    service.pages[nil] = PaginatedResponse(items: [first], nextCursor: "cold-history", hasMore: true)
    service.pages["cold-history"] = PaginatedResponse(items: history, nextCursor: "older", hasMore: true)
    let viewModel = FeedViewModel(service: service)

    await viewModel.loadInitial()

    #expect(viewModel.posts.count == 21)
    #expect(service.feedRequests.map(\.cursor) == [nil, "cold-history"])
    #expect(service.feedRequests.allSatisfy { $0.limit == 20 })
  }

  @Test(.timeLimit(.minutes(1)))
  func delayedHistoryKeepsSkeletonStateUntilSinglePublication() async throws {
    let service = FeedServiceStub()
    let first = try makePost(id: "retained", body: "Recent")
    let history = try (0..<20).map { try makePost(id: "older-\($0)", body: "Older") }
    service.pages[nil] = PaginatedResponse(items: [first], nextCursor: "cold", hasMore: true)
    service.pages["cold"] = PaginatedResponse(items: history, nextCursor: nil, hasMore: false)
    let started = AsyncStream<Void>.makeStream()
    let release = AsyncStream<Void>.makeStream()
    service.beforeResponse = { request in
      if request.cursor == "cold" {
        started.continuation.yield(())
        started.continuation.finish()
        for await _ in release.stream { break }
      }
    }
    let model = FeedViewModel(service: service)
    var publications: [Int] = []
    let observer = model.$posts.dropFirst().sink { publications.append($0.count) }
    defer { observer.cancel(); release.continuation.finish() }
    let loading = Task { await model.loadInitial() }
    for await _ in started.stream { break }
    #expect(model.isLoading)
    #expect(model.posts.isEmpty)
    #expect(publications.isEmpty)
    release.continuation.yield(())
    release.continuation.finish()
    await loading.value
    #expect(publications == [21])
    #expect(!model.isLoading)
    #expect(!model.hasMore)
  }

  @Test
  func ordinaryPageDoesNotAddAnInitialRequest() async throws {
    let service = FeedServiceStub()
    let posts = try (0..<20).map { try makePost(id: "post-\($0)", body: "Post") }
    service.pages[nil] = PaginatedResponse(items: posts, nextCursor: "next", hasMore: true)
    let model = FeedViewModel(service: service)
    await model.loadInitial()
    #expect(service.feedRequests.count == 1)
    #expect(model.posts.count == 20)
  }

  @Test
  func genuinelySinglePostFeedDoesNotWaitForHistory() async throws {
    let service = FeedServiceStub()
    service.pages[nil] = PaginatedResponse(items: [try makePost(id: "only", body: "Only")], nextCursor: nil, hasMore: false)
    let model = FeedViewModel(service: service)
    await model.loadInitial()
    #expect(service.feedRequests.count == 1)
    #expect(model.posts.count == 1)
    #expect(!model.hasMore)
  }

  @Test
  func sparseDuplicatePagesStopAfterOneContinuation() async throws {
    let service = FeedServiceStub()
    let first = try makePost(id: "same", body: "Same")
    service.pages[nil] = PaginatedResponse(items: [first], nextCursor: "next", hasMore: true)
    service.pages["next"] = PaginatedResponse(items: [first], nextCursor: "later", hasMore: true)
    let model = FeedViewModel(service: service)
    await model.loadInitial()
    #expect(service.feedRequests.count == 2)
    #expect(model.posts.count == 1)
    #expect(model.hasMore)
  }

  @Test
  func historyFailurePreservesSuccessfulPageAndRetryCursor() async throws {
    let service = FeedServiceStub()
    service.pages[nil] = PaginatedResponse(items: [try makePost(id: "first", body: "First")], nextCursor: "cold", hasMore: true)
    service.beforeResponse = { request in
      if request.cursor == "cold" { throw URLError(.timedOut) }
    }
    let model = FeedViewModel(service: service)
    await model.loadInitial()
    #expect(model.posts.count == 1)
    #expect(model.error != nil)
    #expect(model.hasMore)
    #expect(!model.isLoading)
    service.beforeResponse = nil
    service.pages["cold"] = PaginatedResponse(items: [try makePost(id: "second", body: "Second")], nextCursor: nil, hasMore: false)
    await model.loadMore()
    #expect(service.feedRequests.map(\.cursor) == [nil, "cold", "cold"])
    #expect(model.posts.count == 2)
  }

  @Test(.timeLimit(.minutes(1)))
  func cancelledInitialHandoffDoesNotPublishPartialRows() async throws {
    let service = FeedServiceStub()
    service.pages[nil] = PaginatedResponse(items: [try makePost(id: "first", body: "First")], nextCursor: "cold", hasMore: true)
    let started = AsyncStream<Void>.makeStream()
    let release = AsyncStream<Void>.makeStream()
    service.beforeResponse = { request in
      if request.cursor == "cold" {
        started.continuation.yield(())
        started.continuation.finish()
        for await _ in release.stream { break }
      }
    }
    let model = FeedViewModel(service: service)
    let loading = Task { await model.loadInitial() }
    for await _ in started.stream { break }
    loading.cancel()
    release.continuation.finish()
    await loading.value
    #expect(model.posts.isEmpty)
    #expect(!model.isLoading)
    #expect(model.error == nil)
  }

  @Test
  func nonAdvancingInitialCursorStopsPaginationWithAnError() async throws {
    let service = FeedServiceStub()
    let first = try makePost(id: "first", body: "First")
    service.pages[nil] = PaginatedResponse(items: [first], nextCursor: "same", hasMore: true)
    service.pages["same"] = PaginatedResponse(items: [first], nextCursor: "same", hasMore: true)
    let model = FeedViewModel(service: service)
    await model.loadInitial()
    #expect(service.feedRequests.count == 2)
    #expect(!model.hasMore)
    #expect(model.error != nil)
    #expect(model.posts.count == 1)
  }

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

  @Test
  func appendedPageAlsoReconfiguresUpdatedExistingRows() throws {
    let original = try makePost(id: "post-1", body: "First", likeCount: 1)
    let updated = try makePost(id: "post-1", body: "First", likeCount: 2)
    let next = try makePost(id: "post-2", body: "Second")
    let plan = FeedDiffableUpdatePlan(previous: [original], current: [updated, next])
    #expect(plan.hasChanges)
    #expect(plan.reconfigureIDs == ["post-1"])
    #expect(plan.reloadIDs.isEmpty)
  }

  @Test
  func unchangedRowsDoNotScheduleAnotherSnapshot() throws {
    let rows = [try makePost(id: "post-1", body: "First")]
    #expect(!FeedDiffableUpdatePlan(previous: rows, current: rows).hasChanges)
  }

  @Test
  func changedCellShapeReloadsInsteadOfReconfiguringWrongReuseIdentifier() throws {
    let original = try makePost(id: "post-1", body: "First")
    let image = try makePost(id: "post-1", body: "First", image: true)
    let plan = FeedDiffableUpdatePlan(previous: [original], current: [image])
    #expect(plan.hasChanges)
    #expect(plan.reloadIDs == ["post-1"])
    #expect(plan.reconfigureIDs.isEmpty)
  }

  private func makePost(
    id: String,
    body: String,
    likeCount: Int = 0,
    isLiked: Bool = false,
    image: Bool = false
  ) throws -> FeedPost {
    var payload: [String: Any] = [
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
    if image {
      payload["media"] = [["url": "file:///feed-fixture.png", "width": 1200, "height": 900]]
    }
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
  var beforeResponse: ((FeedRequest) async throws -> Void)?

  func fetchFeed(cursor: String?, limit: Int) async throws -> PaginatedResponse<FeedPost> {
    let request = FeedRequest(cursor: cursor, limit: limit)
    feedRequests.append(request)
    try await beforeResponse?(request)
    return pages[cursor] ?? PaginatedResponse(items: [], nextCursor: nil, hasMore: false)
  }

  func performPostInteraction(_ endpoint: APIEndpoint) async throws {}

  func votePoll(postId: String, optionIds: [String]) async throws {}
}

/// Exercises UIKit and the real SwiftUI PostCard, rather than only snapshot plans.
@MainActor
@Suite(.serialized)
struct FeedCollectionRenderingTests {
  private static let environment = AppEnvironment()

  @Test
  func initialConfigurationInstallsWholePageBeforeAnotherSwiftUIUpdate() async throws {
    let model = FeedViewModel(service: FeedServiceStub())
    let controller = FeedCollectionViewController(onLoadMore: {}, onScrollDirectionChange: { _ in })
    let posts = try makePosts(count: 20)
    #expect(!controller.isViewLoaded)
    configure(controller, posts: posts, model: model)
    #expect(controller.isViewLoaded)
    let collection = try #require(controller.view.subviews.compactMap { $0 as? UICollectionView }.first)
    #expect(collection.numberOfItems(inSection: 0) == 20)
    let window = mount(controller)
    defer { window.isHidden = true }
    await settle(controller)
    #expect(abs(collection.contentOffset.y + 56) < 1)
    #expect(collection.contentInset.top == 56)
    #expect(collection.indexPathsForVisibleItems.contains(IndexPath(item: 1, section: 0)))
    let first = try #require(collection.layoutAttributesForItem(at: IndexPath(item: 0, section: 0)))
    let second = try #require(collection.layoutAttributesForItem(at: IndexPath(item: 1, section: 0)))
    #expect(first.frame.height > 44)
    #expect(abs(first.frame.maxY - second.frame.minY) < 1)
    let frames = collection.indexPathsForVisibleItems.sorted().compactMap {
      collection.layoutAttributesForItem(at: $0)?.frame
    }
    await settle(controller)
    #expect(frames == collection.indexPathsForVisibleItems.sorted().compactMap {
      collection.layoutAttributesForItem(at: $0)?.frame
    })
  }

  @Test
  func unchangedUpdatesAndPageAppendKeepVisibleCellAndOffset() async throws {
    let model = FeedViewModel(service: FeedServiceStub())
    let controller = FeedCollectionViewController(onLoadMore: {}, onScrollDirectionChange: { _ in })
    let posts = try makePosts(count: 20)
    configure(controller, posts: posts, model: model)
    let window = mount(controller)
    defer { window.isHidden = true }
    await settle(controller)
    let collection = try #require(controller.view.subviews.compactMap { $0 as? UICollectionView }.first)
    collection.setContentOffset(CGPoint(x: 0, y: 260), animated: false)
    await settle(controller)
    let visiblePath = try #require(collection.indexPathsForVisibleItems.sorted().first)
    let cell = try #require(collection.cellForItem(at: visiblePath))
    let offset = collection.contentOffset.y
    for _ in 0..<10 {
      configure(controller, posts: posts, model: model)
    }
    configure(controller, posts: try makePosts(count: 40), model: model)
    await settle(controller)
    #expect(collection.numberOfItems(inSection: 0) == 40)
    #expect(collection.cellForItem(at: visiblePath) === cell)
    #expect(abs(collection.contentOffset.y - offset) < 1)
  }

  @Test
  func prependingWhileReadingPreservesVisiblePostPosition() async throws {
    let model = FeedViewModel(service: FeedServiceStub())
    let controller = FeedCollectionViewController(onLoadMore: {}, onScrollDirectionChange: { _ in })
    let posts = try makePosts(count: 20)
    configure(controller, posts: posts, model: model)
    let window = mount(controller)
    defer { window.isHidden = true }
    await settle(controller)
    let collection = try #require(controller.view.subviews.compactMap { $0 as? UICollectionView }.first)
    collection.setContentOffset(CGPoint(x: 0, y: 300), animated: false)
    await settle(controller)
    let path = try #require(collection.indexPathsForVisibleItems.sorted().first { path in
      (collection.layoutAttributesForItem(at: path)?.frame.maxY ?? 0) > collection.contentOffset.y + 56
    })
    let before = try #require(collection.layoutAttributesForItem(at: path)).frame.minY - collection.contentOffset.y
    let newPost = try makePosts(count: 1, prefix: "new-")[0]
    configure(controller, posts: [newPost] + posts, model: model)
    await settle(controller)
    let newPath = IndexPath(item: path.item + 1, section: 0)
    let after = try #require(collection.layoutAttributesForItem(at: newPath)).frame.minY - collection.contentOffset.y
    #expect(abs(after - before) < 1)
  }

  @Test
  func hostedSizingUsesWidthAndNaturalHeightNotEstimatedHeight() {
    let cell = FeedHostingCollectionViewCell(frame: CGRect(x: 0, y: 0, width: 390, height: 220))
    cell.configure(postID: "media") {
      VStack(spacing: 0) {
        Text(String(repeating: "Cinema and storytelling. ", count: 12))
        Rectangle().aspectRatio(4.0 / 3.0, contentMode: .fit)
      }
      .padding(16)
    }
    let attributes = UICollectionViewLayoutAttributes(forCellWith: IndexPath(item: 0, section: 0))
    attributes.size = CGSize(width: 390, height: 220)
    let first = cell.preferredLayoutAttributesFitting(attributes)
    attributes.size.height = 900
    let second = cell.preferredLayoutAttributesFitting(attributes)
    #expect(first.size.width == 390)
    #expect(first.size.height > 300)
    #expect(first.size == second.size)
    attributes.size.width = 320
    let narrow = cell.preferredLayoutAttributesFitting(attributes)
    #expect(narrow.size.width == 320)
    #expect(narrow.size.height > 0)
    #expect(narrow.size.height != first.size.height)
  }

  @Test
  func embeddedProfileHeightReportsAreDeferredAndDeduplicated() async throws {
    let model = FeedViewModel(service: FeedServiceStub())
    let controller = FeedCollectionViewController(onLoadMore: {}, onScrollDirectionChange: { _ in })
    var heights: [CGFloat] = []
    controller.onContentHeightChange = { heights.append($0) }
    configure(controller, posts: try makePosts(count: 3), model: model, scrolling: false)
    #expect(heights.isEmpty)
    let window = mount(controller)
    defer { window.isHidden = true }
    await settle(controller)
    #expect((heights.last ?? 0) > 1)
    let count = heights.count
    for _ in 0..<10 { controller.view.setNeedsLayout(); controller.view.layoutIfNeeded() }
    await settle(controller)
    #expect(heights.count == count)
  }

  @Test
  func firstMixedRowsRemainReachableAfterSizingAndDynamicTypeChanges() async throws {
    let model = FeedViewModel(service: FeedServiceStub())
    let controller = FeedCollectionViewController(onLoadMore: {}, onScrollDirectionChange: { _ in })
    configure(controller, posts: try makePosts(count: 20, mixed: true), model: model)
    let window = mount(controller)
    defer { window.isHidden = true }
    await settle(controller)
    let collection = try #require(controller.view.subviews.compactMap { $0 as? UICollectionView }.first)
    for index in 0..<7 {
      let path = IndexPath(item: index, section: 0)
      collection.scrollToItem(at: path, at: .top, animated: false)
      await settle(controller)
      let frame = try #require(collection.layoutAttributesForItem(at: path)).frame
      #expect(abs(frame.minY - collection.contentOffset.y - 56) < 1)
      #expect(frame.height > 44)
    }
    let firstPath = IndexPath(item: 0, section: 0)
    collection.scrollToItem(at: firstPath, at: .top, animated: false)
    await settle(controller)
    let normalHeight = try #require(collection.layoutAttributesForItem(at: firstPath)).frame.height
    controller.traitOverrides.preferredContentSizeCategory = .accessibilityExtraExtraExtraLarge
    collection.collectionViewLayout.invalidateLayout()
    await settle(controller)
    let largeHeight = try #require(collection.layoutAttributesForItem(at: firstPath)).frame.height
    #expect(largeHeight > normalHeight)
    #expect(abs(collection.contentOffset.y + 56) < 1)
  }

  @Test
  func shortPagePaginationWaitsForRefreshAndRequestsTailOnlyOnce() async throws {
    let model = FeedViewModel(service: FeedServiceStub())
    var requests = 0
    let controller = FeedCollectionViewController(onLoadMore: { requests += 1 }, onScrollDirectionChange: { _ in })
    let posts = try makePosts(count: 3)
    configure(controller, posts: posts, model: model, canLoadMore: true, refreshing: true)
    let window = mount(controller)
    defer { window.isHidden = true }
    await settle(controller)
    #expect(requests == 0)
    configure(controller, posts: posts, model: model, canLoadMore: true)
    await settle(controller)
    #expect(requests == 1)
    for _ in 0..<10 {
      configure(controller, posts: posts, model: model, canLoadMore: true)
    }
    await settle(controller)
    #expect(requests == 1)
  }

  private func configure(
    _ controller: FeedCollectionViewController,
    posts: [FeedPost],
    model: FeedViewModel,
    scrolling: Bool = true,
    canLoadMore: Bool = false,
    refreshing: Bool = false
  ) {
    controller.configure(
      posts: posts, interactor: model, env: Self.environment, theme: .light,
      navigator: .noop, isScrollEnabled: scrolling, canLoadMore: canLoadMore,
      topContentInset: scrolling ? 56 : 0, bottomContentInset: scrolling ? 64 : 0,
      isRefreshing: refreshing, isLoadingMore: false, currentProfileUsername: nil,
      currentProfileUserId: nil, onOpenPost: nil, onOpenImage: { _, _ in }
    )
  }

  private func mount(_ controller: UIViewController) -> UIWindow {
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    window.rootViewController = controller
    window.isHidden = false
    controller.view.frame = window.bounds
    controller.view.setNeedsLayout()
    controller.view.layoutIfNeeded()
    return window
  }

  private func settle(_ controller: UIViewController) async {
    // Let UIKit commit diffable completion and SwiftUI intrinsic-size invalidations.
    for _ in 0..<4 {
      await Task.yield()
      controller.view.setNeedsLayout()
      controller.view.layoutIfNeeded()
    }
  }

  private func makePosts(count: Int, prefix: String = "post-", mixed: Bool = false) throws -> [FeedPost] {
    try (0..<count).map { index in
      var payload: [String: Any] = [
        "id": "\(prefix)\(index)", "type": "text",
        "body": String(repeating: "Cinema and storytelling. ", count: index.isMultiple(of: 2) ? 1 : 16),
        "createdAt": "2026-07-17T12:00:00Z", "visibility": "public",
        "author": ["id": "user-1", "username": "maya.frames", "displayName": "Maya Frames"],
      ]
      if mixed {
        switch index % 4 {
        case 1:
          payload["media"] = [["url": "file:///feed-fixture.png", "width": 1200, "height": 900]]
        case 2:
          payload["film"] = ["id": "01J00000000000000000000000", "title": "A Film", "year": 2026]
          payload["filmRating"] = 8
        case 3:
          payload["poll"] = [
            "id": "poll-\(index)", "type": "ranking",
            "options": [["id": "option-1", "label": "First", "position": 0],
                        ["id": "option-2", "label": "Second", "position": 1]],
          ]
        default: break
        }
      }
      let decoder = JSONDecoder()
      decoder.dateDecodingStrategy = .iso8601
      return try decoder.decode(FeedPost.self, from: JSONSerialization.data(withJSONObject: payload))
    }
  }
}
