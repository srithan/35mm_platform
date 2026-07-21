import Foundation

@MainActor
final class FeedViewModel: ObservableObject {
  @Published private(set) var posts: [FeedPost] = []
  @Published private(set) var isLoading = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var error: String?
  @Published private(set) var hasMore = true

  private var nextCursor: String?
  private let apiClient: APIClient
  private let pageLimit = 20

  init(apiClient: APIClient) {
    self.apiClient = apiClient
  }

  func loadInitial() async {
    guard !isLoading else { return }

    isLoading = true
    error = nil
    nextCursor = nil
    hasMore = true

    do {
      let response: PaginatedResponse<FeedPost> = try await apiClient.request(
        .getFeed(cursor: nil, limit: pageLimit)
      )
      posts = FeedPost.deduplicating(response.items)
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      self.error = error.localizedDescription
      hasMore = false
    }

    isLoading = false
  }

  func loadMore() async {
    guard !isLoadingMore, !isLoading, hasMore else { return }

    isLoadingMore = true
    error = nil

    do {
      let response: PaginatedResponse<FeedPost> = try await apiClient.request(
        .getFeed(cursor: nextCursor, limit: pageLimit)
      )
      appendDeduped(response.items)
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  func refresh() async {
    guard !isLoading else { return }

    isLoading = true
    error = nil

    do {
      let response: PaginatedResponse<FeedPost> = try await apiClient.request(
        .getFeed(cursor: nil, limit: pageLimit)
      )
      posts = FeedPost.deduplicating(response.items)
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      self.error = error.localizedDescription
    }

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
      let _: FeedPost = try await apiClient.request(.votePoll(postId: postId, optionIds: optionIds))
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
      let _: InteractionResponse = try await apiClient.request(requestEndpoint)
    } catch {
      if let currentIndex = posts.firstIndex(where: { $0.id == postId }) {
        posts[currentIndex] = original
      }
      self.error = error.localizedDescription
    }
  }
}

private struct InteractionResponse: Decodable {
  let ok: Bool?
  let likeCount: Int?
  let folderId: String?
}

extension FeedViewModel: PostInteracting {}
