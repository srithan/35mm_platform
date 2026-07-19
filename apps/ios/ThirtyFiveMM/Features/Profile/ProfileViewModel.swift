import Foundation
import Observation

@MainActor
@Observable
final class ProfileViewModel {
  private(set) var profile: PublicProfile?
  private(set) var posts: [FeedPost] = []
  private(set) var lists: [FilmListSummary] = []
  private(set) var stats: ProfileStatsSummary?
  private(set) var isLoadingProfile = false
  private(set) var isLoadingPosts = false
  private(set) var isLoadingMorePosts = false
  private(set) var isLoadingLists = false
  private(set) var isLoadingMoreLists = false
  private(set) var isLoadingStats = false
  private(set) var isFollowingMutation = false
  private(set) var isBlocked = false
  private(set) var loadError: String?
  private(set) var postsError: String?
  private(set) var listsError: String?
  private(set) var statsError: String?
  private(set) var actionError: String?

  let username: String

  private let service: any ProfileServicing
  private let pageLimit = 20
  private var postsCursor: String?
  private var listsCursor: String?
  private var postsHaveMore = true
  private var listsHaveMore = true
  private var hasLoadedLists = false
  private var hasLoadedStats = false

  init(username: String, service: any ProfileServicing) {
    self.username = username.lowercased()
    self.service = service
  }

  var visiblePosts: [FeedPost] {
    posts.filter { post in
      let isDiaryType = post.type == .log || post.type == .review
      return !(isDiaryType && post.visibility == .private)
    }
  }

  var diaryPosts: [FeedPost] {
    posts.filter { $0.type == .log || $0.type == .review }
  }

  var diarySections: [ProfileDiarySection] {
    let calendar = Calendar.current
    let grouped = Dictionary(grouping: diaryPosts) { post in
      let components = calendar.dateComponents([.year, .month], from: post.createdAt)
      return calendar.date(from: components) ?? post.createdAt
    }
    return grouped
      .map { ProfileDiarySection(month: $0.key, posts: $0.value.sorted { $0.createdAt > $1.createdAt }) }
      .sorted { $0.month > $1.month }
  }

  var screenPhase: ProfileScreenPhase {
    if isBlocked {
      return .blocked
    }
    if let profile {
      return .content(profile)
    }
    if let loadError {
      return .failure(loadError)
    }
    return .loading
  }

  var canLoadMorePosts: Bool { postsHaveMore && !isLoadingMorePosts && !isLoadingPosts }
  var canLoadMoreLists: Bool { listsHaveMore && !isLoadingMoreLists && !isLoadingLists }

  func load() async {
    guard !isLoadingProfile, profile == nil else { return }

    isLoadingProfile = true
    isLoadingPosts = true
    loadError = nil
    postsError = nil

    do {
      profile = try await service.fetchProfile(username: username)
    } catch {
      loadError = error.localizedDescription
    }

    do {
      let response = try await service.fetchProfilePosts(username: username, cursor: nil, limit: pageLimit)
      posts = response.items
      postsCursor = response.nextCursor
      postsHaveMore = response.hasMore
    } catch {
      postsError = error.localizedDescription
      postsHaveMore = false
    }

    isLoadingProfile = false
    isLoadingPosts = false
  }

  func refresh(selectedTab: ProfileTab) async {
    guard !isLoadingProfile else { return }

    isLoadingProfile = true
    loadError = nil
    do {
      profile = try await service.fetchProfile(username: username)
    } catch {
      loadError = error.localizedDescription
    }
    isLoadingProfile = false

    await reloadPosts()
    if selectedTab == .lists {
      await reloadLists()
    } else if selectedTab == .stats {
      hasLoadedStats = false
      await loadStatsIfNeeded()
    }
  }

  func loadTabIfNeeded(_ tab: ProfileTab) async {
    switch tab {
    case .posts, .diary:
      break
    case .lists:
      await loadListsIfNeeded()
    case .stats:
      await loadStatsIfNeeded()
    }
  }

  func loadMorePosts() async {
    guard canLoadMorePosts else { return }
    isLoadingMorePosts = true
    postsError = nil

    do {
      let response = try await service.fetchProfilePosts(
        username: username,
        cursor: postsCursor,
        limit: pageLimit
      )
      appendDedupedPosts(response.items)
      postsCursor = response.nextCursor
      postsHaveMore = response.hasMore
    } catch {
      postsError = error.localizedDescription
    }

    isLoadingMorePosts = false
  }

  func loadMoreLists() async {
    guard canLoadMoreLists else { return }
    isLoadingMoreLists = true
    listsError = nil

    do {
      let response = try await service.fetchProfileLists(
        username: username,
        cursor: listsCursor,
        limit: pageLimit
      )
      var seen = Set(lists.map(\.id))
      lists.append(contentsOf: response.items.filter { seen.insert($0.id).inserted })
      listsCursor = response.nextCursor
      listsHaveMore = response.hasMore
    } catch {
      listsError = error.localizedDescription
    }

    isLoadingMoreLists = false
  }

  func retryPosts() async {
    await reloadPosts()
  }

  func retryLists() async {
    hasLoadedLists = false
    await loadListsIfNeeded()
  }

  func retryStats() async {
    hasLoadedStats = false
    await loadStatsIfNeeded()
  }

  func toggleFollow() async {
    guard let current = profile, !current.isOwnProfile, !isFollowingMutation else { return }
    isFollowingMutation = true
    actionError = nil

    do {
      switch current.followState {
      case .none:
        let response = try await service.follow(userId: current.userId)
        let nextState: ProfileFollowState = response.status == "pending" ? .requested : .following
        let nextCount = nextState == .following ? current.followerCount + 1 : current.followerCount
        profile = current.updatingRelationship(followState: nextState, followerCount: nextCount)
      case .requested:
        try await service.unfollow(userId: current.userId)
        profile = current.updatingRelationship(followState: ProfileFollowState.none)
      case .following:
        try await service.unfollow(userId: current.userId)
        profile = current.updatingRelationship(
          followState: ProfileFollowState.none,
          followerCount: max(0, current.followerCount - 1)
        )
      case .selfProfile:
        break
      }
    } catch {
      actionError = error.localizedDescription
    }

    isFollowingMutation = false
  }

  func toggleMute() async {
    guard let current = profile, !current.isOwnProfile else { return }
    let nextMuted = !(current.isMutedByViewer ?? false)
    actionError = nil

    do {
      try await service.setMuted(userId: current.userId, muted: nextMuted)
      profile = current.updatingRelationship(isMutedByViewer: nextMuted)
    } catch {
      actionError = error.localizedDescription
    }
  }

  func block() async {
    guard let current = profile, !current.isOwnProfile else { return }
    actionError = nil

    do {
      try await service.block(userId: current.userId)
      isBlocked = true
    } catch {
      actionError = error.localizedDescription
    }
  }

  func applyUpdatedProfile(_ updated: PublicProfile) {
    profile = updated
  }

  func clearActionError() {
    actionError = nil
  }

  private func reloadPosts() async {
    guard !isLoadingPosts else { return }
    isLoadingPosts = true
    postsError = nil

    do {
      let response = try await service.fetchProfilePosts(username: username, cursor: nil, limit: pageLimit)
      posts = response.items
      postsCursor = response.nextCursor
      postsHaveMore = response.hasMore
    } catch {
      postsError = error.localizedDescription
    }

    isLoadingPosts = false
  }

  private func loadListsIfNeeded() async {
    guard !hasLoadedLists else { return }
    await reloadLists()
  }

  private func reloadLists() async {
    guard !isLoadingLists else { return }
    isLoadingLists = true
    listsError = nil

    do {
      let response = try await service.fetchProfileLists(username: username, cursor: nil, limit: pageLimit)
      lists = response.items
      listsCursor = response.nextCursor
      listsHaveMore = response.hasMore
      hasLoadedLists = true
    } catch {
      listsError = error.localizedDescription
    }

    isLoadingLists = false
  }

  private func loadStatsIfNeeded() async {
    guard !hasLoadedStats, !isLoadingStats else { return }
    isLoadingStats = true
    statsError = nil

    do {
      stats = try await service.fetchProfileStats(username: username)
      hasLoadedStats = true
    } catch {
      statsError = error.localizedDescription
    }

    isLoadingStats = false
  }

  private func appendDedupedPosts(_ newPosts: [FeedPost]) {
    var seen = Set(posts.map(\.id))
    posts.append(contentsOf: newPosts.filter { seen.insert($0.id).inserted })
  }
}

extension ProfileViewModel: PostInteracting {
  func toggleLike(postId: String) async {
    await togglePost(
      postId: postId,
      optimistic: { $0.toggledLike() },
      mutation: { [service] original in
        try await service.setPostLike(postId: postId, liked: !original.isLiked)
      }
    )
  }

  func toggleRepost(postId: String) async {
    await togglePost(
      postId: postId,
      optimistic: { $0.toggledRepost() },
      mutation: { [service] original in
        try await service.setPostRepost(postId: postId, reposted: !original.isReposted)
      }
    )
  }

  func toggleBookmark(postId: String) async {
    await togglePost(
      postId: postId,
      optimistic: { $0.toggledBookmark() },
      mutation: { [service] original in
        try await service.setPostBookmark(postId: postId, bookmarked: !original.isBookmarked)
      }
    )
  }

  func votePoll(postId: String, optionIds: [String]) async {
    guard let index = posts.firstIndex(where: { $0.id == postId }) else { return }
    let original = posts[index]
    guard let optimistic = original.votedPoll(optionIds: optionIds) else { return }
    posts[index] = optimistic

    do {
      try await service.votePoll(postId: postId, optionIds: optionIds)
    } catch {
      restorePost(original)
      actionError = error.localizedDescription
    }
  }

  private func togglePost(
    postId: String,
    optimistic: (FeedPost) -> FeedPost,
    mutation: (FeedPost) async throws -> Void
  ) async {
    guard let index = posts.firstIndex(where: { $0.id == postId }) else { return }
    let original = posts[index]
    posts[index] = optimistic(original)

    do {
      try await mutation(original)
    } catch {
      restorePost(original)
      actionError = error.localizedDescription
    }
  }

  private func restorePost(_ post: FeedPost) {
    guard let index = posts.firstIndex(where: { $0.id == post.id }) else { return }
    posts[index] = post
  }
}
