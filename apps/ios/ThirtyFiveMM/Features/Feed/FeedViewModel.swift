import Foundation
import OSLog

@MainActor
final class FeedViewModel: ObservableObject {
  @Published private(set) var posts: [FeedPost] = []
  @Published private(set) var isLoading = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var error: String?
  @Published private(set) var hasMore = true

  private var nextCursor: String?
  private var hasLoadedInitial = false
  private var lastLoadedAt: Date?
  private let service: any FeedServicing
  private let pageLimit = 20
  // A retained-feed page can contain only one post before handing off to cold
  // history. Assemble a useful initial batch before exposing the loaded surface.
  // This is bounded to one continuation, never a scan to fill an entire feed.
  private let initialMinimumPosts = 6
  private let logger = Logger(subsystem: "com.35mm.app", category: "FeedLoading")
  private let freshnessInterval: TimeInterval = 60
  private var activeRefreshID: UUID?

  init(apiClient: APIClient) {
    service = FeedService(apiClient: apiClient)
  }

  init(service: any FeedServicing) {
    self.service = service
  }

  func loadInitialIfNeeded() async {
    guard hasLoadedInitial else {
      await loadInitial()
      return
    }

    if shouldRevalidate {
      await refresh()
    }
  }

  func loadInitial() async {
    guard !isLoading else { return }

    isLoading = true
    error = nil
    nextCursor = nil
    hasMore = true
    let refreshID = UUID()
    activeRefreshID = refreshID

    defer {
      if activeRefreshID == refreshID { isLoading = false }
    }

    do {
      var response = try await service.fetchFeed(cursor: nil, limit: pageLimit)
      guard !Task.isCancelled, activeRefreshID == refreshID else { return }
      var initialPosts = FeedPost.deduplicating(response.items)
      var continuationIsValid = true
      logger.debug("Initial feed page contains \(initialPosts.count) unique posts; hasMore=\(response.hasMore)")

      if initialPosts.count < initialMinimumPosts, response.hasMore,
         let cursor = response.nextCursor {
        do {
          let continuation = try await service.fetchFeed(cursor: cursor, limit: pageLimit)
          guard !Task.isCancelled, activeRefreshID == refreshID else { return }
          initialPosts = FeedPost.deduplicating(initialPosts + continuation.items)
          response = continuation
          if continuation.hasMore && continuation.nextCursor == cursor {
            logger.error("Initial feed continuation returned a non-advancing cursor")
            error = "The feed couldn't continue. Pull to refresh to try again."
            continuationIsValid = false
          }
        } catch {
          guard !Task.isCancelled, activeRefreshID == refreshID else { return }
          // Keep the successful first page and its cursor so a later pagination
          // attempt can retry. Never discard readable content on a partial failure.
          logger.error("Initial feed continuation failed; retaining the successful first page")
          self.error = error.localizedDescription
        }
      }

      guard !Task.isCancelled, activeRefreshID == refreshID else { return }
      if response.hasMore && response.nextCursor == nil {
        continuationIsValid = false
        logger.error("Initial feed returned hasMore without a continuation cursor")
        error = "The feed couldn't continue. Pull to refresh to try again."
      }
      // Publish once after the bounded handoff, not first-page rows followed by
      // another insertion as soon as UICollectionView requests pagination.
      posts = initialPosts
      nextCursor = continuationIsValid ? response.nextCursor : nil
      hasMore = response.hasMore && continuationIsValid
      hasLoadedInitial = true
      lastLoadedAt = Date()
      logger.debug("Initial feed published \(initialPosts.count) posts")
    } catch {
      guard !Task.isCancelled, activeRefreshID == refreshID else { return }
      logger.error("Initial feed request failed")
      self.error = error.localizedDescription
      hasMore = false
    }
  }

  func loadMore() async {
    guard !isLoadingMore, !isLoading, hasMore else { return }

    isLoadingMore = true
    error = nil

    do {
      let response = try await service.fetchFeed(cursor: nextCursor, limit: pageLimit)
      guard !Task.isCancelled else {
        isLoadingMore = false
        return
      }
      appendDeduped(response.items)
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  func refresh() async {
    guard !isLoading, !isLoadingMore else { return }

    isLoading = true
    error = nil
    let refreshID = UUID()
    activeRefreshID = refreshID

    do {
      let response = try await service.fetchFeed(cursor: nil, limit: pageLimit)
      guard !Task.isCancelled else {
        isLoading = false
        return
      }
      guard activeRefreshID == refreshID else { return }
      posts = FeedPost.deduplicating(response.items + posts)
      nextCursor = response.nextCursor
      hasMore = response.hasMore
      hasLoadedInitial = true
      lastLoadedAt = Date()
    } catch {
      guard activeRefreshID == refreshID else { return }
      self.error = error.localizedDescription
    }

    guard activeRefreshID == refreshID else { return }
    isLoading = false
  }

  func toggleLike(postId: String) async {
    await toggle(
      postId: postId,
      optimistic: { $0.toggledLike() },
      endpoint: { $0.isLiked ? .unlikePost(postId) : .likePost(postId) }
    )
  }

  func toggleRepost(postId: String) async {
    await toggle(
      postId: postId,
      optimistic: { $0.toggledRepost() },
      endpoint: { $0.isReposted ? .unrepostPost(postId) : .repostPost(postId) }
    )
  }

  func toggleBookmark(postId: String) async {
    await toggle(
      postId: postId,
      optimistic: { $0.toggledBookmark() },
      endpoint: { $0.isBookmarked ? .unbookmarkPost(postId) : .bookmarkPost(postId) }
    )
  }

  func votePoll(postId: String, optionIds: [String]) async {
    guard let index = posts.firstIndex(where: { $0.id == postId }) else { return }

    let original = posts[index]
    guard let optimistic = original.votedPoll(optionIds: optionIds) else { return }

    posts[index] = optimistic
    error = nil

    do {
      try await service.votePoll(postId: postId, optionIds: optionIds)
      guard !Task.isCancelled else { return }
    } catch {
      if let currentIndex = posts.firstIndex(where: { $0.id == postId }) {
        posts[currentIndex] = original
      }
      self.error = error.localizedDescription
    }
  }

  func clearError() {
    error = nil
  }

  func prependCreatedPost(_ post: FeedPost) {
    posts = FeedPost.deduplicating([post] + posts)
  }

  private func appendDeduped(_ newPosts: [FeedPost]) {
    posts = FeedPost.deduplicating(posts + newPosts)
  }

  private var shouldRevalidate: Bool {
    guard let lastLoadedAt else { return true }
    return Date().timeIntervalSince(lastLoadedAt) > freshnessInterval
  }

  private func toggle(
    postId: String,
    optimistic: (FeedPost) -> FeedPost,
    endpoint: (FeedPost) -> APIEndpoint
  ) async {
    guard let index = posts.firstIndex(where: { $0.id == postId }) else { return }

    let original = posts[index]
    let requestEndpoint = endpoint(original)
    posts[index] = optimistic(original)

    do {
      try await service.performPostInteraction(requestEndpoint)
      guard !Task.isCancelled else { return }
    } catch {
      if let currentIndex = posts.firstIndex(where: { $0.id == postId }) {
        posts[currentIndex] = original
      }
      self.error = error.localizedDescription
    }
  }
}

extension FeedViewModel: PostInteracting {}
