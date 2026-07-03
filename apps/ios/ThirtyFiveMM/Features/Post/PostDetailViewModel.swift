import Foundation

@MainActor
final class PostDetailViewModel: ObservableObject {
  @Published private(set) var post: FeedPost
  @Published private(set) var commentTree: [CommentNode] = []
  @Published private(set) var isLoadingComments = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var hasMoreComments = true
  @Published private(set) var isPostingComment = false
  @Published private(set) var error: String?
  @Published var replyingTo: Comment?

  private var flatComments: [Comment] = []
  private var nextCursor: String?
  private let apiClient: APIClient
  private let pageLimit = 20

  init(post: FeedPost, apiClient: APIClient) {
    self.post = post
    self.apiClient = apiClient
  }

  func loadComments() async {
    guard !isLoadingComments else { return }

    isLoadingComments = true
    error = nil
    nextCursor = nil
    hasMoreComments = true

    do {
      let response: PaginatedResponse<Comment> = try await apiClient.request(
        .getComments(postId: post.id, cursor: nil, limit: pageLimit)
      )
      flatComments = response.items
      rebuildTree()
      nextCursor = response.nextCursor
      hasMoreComments = response.hasMore
    } catch {
      self.error = error.localizedDescription
      hasMoreComments = false
    }

    isLoadingComments = false
  }

  func loadMoreComments() async {
    guard !isLoadingMore, !isLoadingComments, hasMoreComments else { return }

    isLoadingMore = true
    error = nil

    do {
      let response: PaginatedResponse<Comment> = try await apiClient.request(
        .getComments(postId: post.id, cursor: nextCursor, limit: pageLimit)
      )
      appendDeduped(response.items)
      rebuildTree()
      nextCursor = response.nextCursor
      hasMoreComments = response.hasMore
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  func toggleLike(postId: String) async {
    await togglePost(
      postId: postId,
      optimistic: { $0.toggledLike() },
      endpoint: { $0.isLiked ? .unlikePost(postId) : .likePost(postId) }
    )
  }

  func toggleRepost(postId: String) async {
    await togglePost(
      postId: postId,
      optimistic: { $0.toggledRepost() },
      endpoint: { $0.isReposted ? .unrepostPost(postId) : .repostPost(postId) }
    )
  }

  func toggleBookmark(postId: String) async {
    await togglePost(
      postId: postId,
      optimistic: { $0.toggledBookmark() },
      endpoint: { $0.isBookmarked ? .unbookmarkPost(postId) : .bookmarkPost(postId) }
    )
  }

  func votePoll(postId: String, optionIds: [String]) async {
    guard post.id == postId else { return }

    let original = post
    guard let optimistic = original.votedPoll(optionIds: optionIds) else { return }

    post = optimistic
    error = nil

    do {
      let _: FeedPost = try await apiClient.request(.votePoll(postId: postId, optionIds: optionIds))
    } catch {
      post = original
      self.error = error.localizedDescription
    }
  }

  func toggleCommentLike(comment: Comment) async {
    guard let index = flatComments.firstIndex(where: { $0.id == comment.id }) else { return }

    let original = flatComments[index]
    let requestEndpoint =
      original.isLiked
      ? APIEndpoint.unlikeComment(postId: post.id, commentId: original.id)
      : APIEndpoint.likeComment(postId: post.id, commentId: original.id)

    flatComments[index] = original.toggledLike()
    rebuildTree()
    error = nil

    do {
      let response: CommentInteractionResponse = try await apiClient.request(requestEndpoint)
      if let currentIndex = flatComments.firstIndex(where: { $0.id == original.id }) {
        flatComments[currentIndex] = flatComments[currentIndex].withLikeCount(response.likeCount)
        rebuildTree()
      }
    } catch {
      if let currentIndex = flatComments.firstIndex(where: { $0.id == original.id }) {
        flatComments[currentIndex] = original
        rebuildTree()
      }
      self.error = error.localizedDescription
    }
  }

  func submitComment(body: String) async {
    let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, !isPostingComment else { return }

    isPostingComment = true
    error = nil

    let parentId = replyingTo?.id

    do {
      let created: Comment = try await apiClient.request(
        .postComment(postId: post.id, body: trimmed, parentId: parentId)
      )

      if parentId == nil {
        flatComments.insert(created, at: 0)
      } else {
        flatComments.append(created)
      }

      incrementCommentCount()
      rebuildTree()
      clearReply()
    } catch {
      self.error = error.localizedDescription
    }

    isPostingComment = false
  }

  func clearReply() {
    replyingTo = nil
  }

  func clearError() {
    error = nil
  }

  private func appendDeduped(_ comments: [Comment]) {
    var seen = Set(flatComments.map(\.id))
    let filtered = comments.filter { seen.insert($0.id).inserted }
    flatComments.append(contentsOf: filtered)
  }

  private func rebuildTree() {
    commentTree = CommentTree.build(from: flatComments)
  }

  private func incrementCommentCount() {
    post = FeedPost(
      id: post.id,
      type: post.type,
      headline: post.headline,
      body: post.body,
      createdAt: post.createdAt,
      editedAt: post.editedAt,
      isRepost: post.isRepost,
      repostOfId: post.repostOfId,
      visibility: post.visibility,
      likeCount: post.likeCount,
      commentCount: post.commentCount + 1,
      repostCount: post.repostCount,
      bookmarkCount: post.bookmarkCount,
      isLiked: post.isLiked,
      isReposted: post.isReposted,
      isBookmarked: post.isBookmarked,
      filmRating: post.filmRating,
      media: post.media,
      mediaUrls: post.mediaUrls,
      linkPreview: post.linkPreview,
      film: post.film,
      author: post.author,
      poll: post.poll
    )
  }

  private func togglePost(
    postId: String,
    optimistic: (FeedPost) -> FeedPost,
    endpoint: (FeedPost) -> APIEndpoint
  ) async {
    guard post.id == postId else { return }

    let original = post
    let requestEndpoint = endpoint(original)
    post = optimistic(original)
    error = nil

    do {
      let _: PostInteractionResponse = try await apiClient.request(requestEndpoint)
    } catch {
      post = original
      self.error = error.localizedDescription
    }
  }
}

extension PostDetailViewModel: PostInteracting {}

private struct CommentInteractionResponse: Decodable {
  let likeCount: Int
}

private struct PostInteractionResponse: Decodable {
  let ok: Bool?
  let likeCount: Int?
  let folderId: String?
}
