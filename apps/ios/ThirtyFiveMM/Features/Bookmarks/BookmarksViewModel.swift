import Foundation
import UIKit

@MainActor
final class BookmarksViewModel: ObservableObject {
  @Published private(set) var posts: [FeedPost] = []
  @Published private(set) var folders: [BookmarkFolder] = []
  @Published private(set) var unsortedCount = 0
  @Published private(set) var isLoading = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var isRefreshingFolders = false
  @Published private(set) var error: String?
  @Published private(set) var hasMore = true
  @Published var selectedFilter: BookmarkFilter = .all
  @Published var searchText = ""

  private var nextCursor: String?
  private let apiClient: APIClient
  private let pageLimit = 20

  var filters: [BookmarkFilter] {
    var values: [BookmarkFilter] = [.all, .unsorted]
    values.append(contentsOf: folders.map { .folder($0) })
    return values
  }

  var visiblePosts: [FeedPost] {
    let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard !query.isEmpty else { return posts }

    return posts.filter { post in
      searchableText(for: post).contains(query)
    }
  }

  var selectedFolder: BookmarkFolder? {
    if case .folder(let folder) = selectedFilter {
      return folder
    }

    return nil
  }

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
      let foldersPayload: BookmarkFoldersResponse = try await apiClient.request(.getBookmarkFolders())
      let bookmarksPayload: PaginatedResponse<FeedPost> = try await apiClient.request(
        .getBookmarks(cursor: nil, limit: pageLimit, folderId: selectedFilter.folderQueryValue)
      )
      folders = foldersPayload.folders
      unsortedCount = foldersPayload.unsortedCount
      posts = bookmarksPayload.items
      nextCursor = bookmarksPayload.nextCursor
      hasMore = bookmarksPayload.hasMore
      normalizeSelectedFilter()
    } catch {
      self.error = error.localizedDescription
      hasMore = false
    }

    isLoading = false
  }

  func refresh() async {
    guard !isLoading else { return }
    await loadInitial()
  }

  func selectFilter(_ filter: BookmarkFilter) {
    guard selectedFilter.id != filter.id else { return }
    selectedFilter = filter
    Task { await loadInitial() }
  }

  func loadMore() async {
    guard !isLoadingMore, !isLoading, hasMore else { return }

    isLoadingMore = true
    error = nil

    do {
      let response: PaginatedResponse<FeedPost> = try await apiClient.request(
        .getBookmarks(cursor: nextCursor, limit: pageLimit, folderId: selectedFilter.folderQueryValue)
      )
      appendDeduped(response.items)
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  func createFolder(name: String) async {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }

    do {
      let response: BookmarkFolderResponse = try await apiClient.request(.createBookmarkFolder(name: trimmed))
      folders.insert(response.folder, at: 0)
      selectedFilter = .folder(response.folder)
      await loadInitial()
    } catch {
      self.error = error.localizedDescription
    }
  }

  func renameSelectedFolder(to name: String) async {
    guard let folder = selectedFolder else { return }
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }

    do {
      let response: BookmarkFolderResponse = try await apiClient.request(
        .updateBookmarkFolder(folderId: folder.id, name: trimmed)
      )
      replaceFolder(response.folder)
      selectedFilter = .folder(response.folder)
    } catch {
      self.error = error.localizedDescription
    }
  }

  func deleteSelectedFolder() async {
    guard let folder = selectedFolder else { return }

    do {
      try await apiClient.requestVoid(.deleteBookmarkFolder(folderId: folder.id))
      folders.removeAll { $0.id == folder.id }
      selectedFilter = .all
      await loadInitial()
    } catch {
      self.error = error.localizedDescription
    }
  }

  func move(postId: String, to folderId: String?) async {
    guard let index = posts.firstIndex(where: { $0.id == postId }) else { return }

    let original = posts[index]
    posts[index] = original.movedBookmark(to: folderId)
    error = nil

    do {
      let _: BookmarkInteractionResponse = try await apiClient.request(
        .assignBookmark(postId: postId, folderId: folderId)
      )
      await refreshFolders()
      if shouldRemovePostAfterMove(folderId: folderId) {
        posts.removeAll { $0.id == postId }
      }
    } catch {
      if let currentIndex = posts.firstIndex(where: { $0.id == postId }) {
        posts[currentIndex] = original
      } else {
        posts.insert(original, at: min(index, posts.count))
      }
      self.error = error.localizedDescription
    }
  }

  func toggleLike(postId: String) async {
    await toggle(
      postId: postId,
      optimistic: { $0.toggledLike() },
      endpoint: { $0.isLiked ? .unlikePost(postId) : .likePost(postId) },
      removeAfterSuccess: false
    )
  }

  func toggleRepost(postId: String) async {
    await toggle(
      postId: postId,
      optimistic: { $0.toggledRepost() },
      endpoint: { $0.isReposted ? .unrepostPost(postId) : .repostPost(postId) },
      removeAfterSuccess: false
    )
  }

  func toggleBookmark(postId: String) async {
    await toggle(
      postId: postId,
      optimistic: { $0.toggledBookmark() },
      endpoint: { $0.isBookmarked ? .unbookmarkPost(postId) : .bookmarkPost(postId) },
      removeAfterSuccess: true
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

  func copyLink(postId: String) {
    UIPasteboard.general.string = "https://35mm.app/posts/\(postId)"
  }

  func clearError() {
    error = nil
  }

  private func refreshFolders() async {
    guard !isRefreshingFolders else { return }

    isRefreshingFolders = true
    defer { isRefreshingFolders = false }

    do {
      let response: BookmarkFoldersResponse = try await apiClient.request(.getBookmarkFolders())
      folders = response.folders
      unsortedCount = response.unsortedCount
      normalizeSelectedFilter()
    } catch {
      self.error = error.localizedDescription
    }
  }

  private func toggle(
    postId: String,
    optimistic: (FeedPost) -> FeedPost,
    endpoint: (FeedPost) -> APIEndpoint,
    removeAfterSuccess: Bool
  ) async {
    guard let index = posts.firstIndex(where: { $0.id == postId }) else { return }

    let original = posts[index]
    let requestEndpoint = endpoint(original)
    posts[index] = optimistic(original)
    error = nil

    do {
      let _: BookmarkInteractionResponse = try await apiClient.request(requestEndpoint)
      if removeAfterSuccess, original.isBookmarked {
        posts.removeAll { $0.id == postId }
        await refreshFolders()
      }
    } catch {
      if let currentIndex = posts.firstIndex(where: { $0.id == postId }) {
        posts[currentIndex] = original
      } else {
        posts.insert(original, at: min(index, posts.count))
      }
      self.error = error.localizedDescription
    }
  }

  private func appendDeduped(_ newPosts: [FeedPost]) {
    var seen = Set(posts.map(\.id))
    let filtered = newPosts.filter { seen.insert($0.id).inserted }
    posts.append(contentsOf: filtered)
  }

  private func replaceFolder(_ folder: BookmarkFolder) {
    if let index = folders.firstIndex(where: { $0.id == folder.id }) {
      folders[index] = folder
    }
  }

  private func normalizeSelectedFilter() {
    guard case .folder(let selectedFolder) = selectedFilter else { return }
    if let refreshed = folders.first(where: { $0.id == selectedFolder.id }) {
      selectedFilter = .folder(refreshed)
    } else {
      selectedFilter = .all
    }
  }

  private func shouldRemovePostAfterMove(folderId: String?) -> Bool {
    switch selectedFilter {
    case .all:
      return false
    case .unsorted:
      return folderId != nil
    case .folder(let folder):
      return folder.id != folderId
    }
  }

  private func searchableText(for post: FeedPost) -> String {
    [
      post.headline,
      post.body,
      post.author.displayName,
      post.author.username,
      post.film?.title,
      post.film?.director,
    ]
    .compactMap { $0 }
    .joined(separator: " ")
    .lowercased()
  }
}

extension BookmarksViewModel: PostInteracting {}

enum BookmarkFilter: Identifiable, Hashable {
  case all
  case unsorted
  case folder(BookmarkFolder)

  var id: String {
    switch self {
    case .all:
      return "all"
    case .unsorted:
      return "unsorted"
    case .folder(let folder):
      return "folder-\(folder.id)"
    }
  }

  var folderQueryValue: String? {
    switch self {
    case .all:
      return nil
    case .unsorted:
      return "none"
    case .folder(let folder):
      return folder.id
    }
  }
}

private struct BookmarkInteractionResponse: Decodable {
  let ok: Bool?
  let folderId: String?
  let isBookmarked: Bool?
  let bookmarkCount: Int?
}
