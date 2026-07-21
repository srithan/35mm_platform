import Foundation
import UIKit

@MainActor
final class BookmarksViewModel: ObservableObject {
  static let folderNameLimit = 80

  @Published private(set) var posts: [FeedPost] = []
  @Published private(set) var folders: [BookmarkFolder] = []
  @Published private(set) var unsortedCount = 0
  @Published private(set) var isLoading = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var isRefreshingFolders = false
  @Published private(set) var isMutatingFolder = false
  @Published private(set) var pendingPostIDs: Set<String> = []
  @Published private(set) var error: String?
  @Published private(set) var hasMore = true
  @Published var selectedFilter: BookmarkFilter = .all
  @Published var searchText = ""

  private var nextCursor: String?
  private var activeLoadID = UUID()
  private let service: any BookmarkServicing
  private let pageLimit: Int

  var filters: [BookmarkFilter] {
    [.all, .unsorted] + folders.map(BookmarkFilter.folder)
  }

  var visiblePosts: [FeedPost] {
    let query = normalizedSearchText
    guard !query.isEmpty else { return posts }

    return posts.filter { post in
      searchableText(for: post).localizedStandardContains(query)
    }
  }

  var selectedFolder: BookmarkFolder? {
    if case .folder(let folder) = selectedFilter {
      folder
    } else {
      nil
    }
  }

  var selectedTitle: String {
    switch selectedFilter {
    case .all:
      "All bookmarks"
    case .unsorted:
      "Unsorted"
    case .folder(let folder):
      folder.name
    }
  }

  var selectedCount: Int {
    switch selectedFilter {
    case .all:
      folders.reduce(unsortedCount) { $0 + $1.itemCount }
    case .unsorted:
      unsortedCount
    case .folder(let folder):
      folder.itemCount
    }
  }

  var isSearching: Bool {
    !normalizedSearchText.isEmpty
  }

  init(apiClient: APIClient, pageLimit: Int = 20) {
    self.service = BookmarkService(apiClient: apiClient)
    self.pageLimit = pageLimit
  }

  init(service: any BookmarkServicing, pageLimit: Int = 20) {
    self.service = service
    self.pageLimit = pageLimit
  }

  func loadInitial() async {
    let loadID = UUID()
    let folderId = selectedFilter.folderQueryValue
    activeLoadID = loadID
    isLoading = true
    error = nil

    do {
      let foldersPayload = try await service.fetchFolders()
      let bookmarksPayload = try await service.fetchBookmarks(
        cursor: nil,
        limit: pageLimit,
        folderId: folderId
      )
      guard activeLoadID == loadID else { return }

      folders = foldersPayload.folders
      unsortedCount = foldersPayload.unsortedCount
      posts = bookmarksPayload.items
      nextCursor = bookmarksPayload.nextCursor
      hasMore = bookmarksPayload.hasMore
      normalizeSelectedFilter()
    } catch {
      guard activeLoadID == loadID else { return }
      self.error = error.localizedDescription
      hasMore = false
    }

    guard activeLoadID == loadID else { return }
    isLoading = false
  }

  func refresh() async {
    await loadInitial()
  }

  func selectFilter(_ filter: BookmarkFilter) {
    guard selectedFilter.id != filter.id else { return }
    selectedFilter = filter
    Task { await loadInitial() }
  }

  func loadMore() async {
    guard !isLoadingMore, !isLoading, hasMore else { return }

    let filterID = selectedFilter.id
    let cursor = nextCursor
    isLoadingMore = true
    error = nil

    do {
      let response = try await service.fetchBookmarks(
        cursor: cursor,
        limit: pageLimit,
        folderId: selectedFilter.folderQueryValue
      )
      guard selectedFilter.id == filterID else {
        isLoadingMore = false
        return
      }
      appendDeduped(response.items)
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      guard selectedFilter.id == filterID else {
        isLoadingMore = false
        return
      }
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  @discardableResult
  func createFolder(name: String) async -> Bool {
    let trimmed = normalizedFolderName(name)
    guard !trimmed.isEmpty, !isMutatingFolder else { return false }

    isMutatingFolder = true
    defer { isMutatingFolder = false }
    error = nil

    do {
      let folder = try await service.createFolder(name: trimmed)
      folders.insert(folder, at: 0)
      selectedFilter = .folder(folder)
      await loadInitial()
      return true
    } catch {
      self.error = error.localizedDescription
      return false
    }
  }

  @discardableResult
  func renameSelectedFolder(to name: String) async -> Bool {
    guard let folder = selectedFolder, !isMutatingFolder else { return false }
    let trimmed = normalizedFolderName(name)
    guard !trimmed.isEmpty else { return false }

    isMutatingFolder = true
    defer { isMutatingFolder = false }
    error = nil

    do {
      let updatedFolder = try await service.renameFolder(id: folder.id, name: trimmed)
      replaceFolder(updatedFolder)
      selectedFilter = .folder(updatedFolder)
      return true
    } catch {
      self.error = error.localizedDescription
      return false
    }
  }

  @discardableResult
  func deleteSelectedFolder() async -> Bool {
    guard let folder = selectedFolder, !isMutatingFolder else { return false }

    isMutatingFolder = true
    defer { isMutatingFolder = false }
    error = nil

    do {
      try await service.deleteFolder(id: folder.id)
      folders.removeAll { $0.id == folder.id }
      selectedFilter = .all
      await loadInitial()
      return true
    } catch {
      self.error = error.localizedDescription
      return false
    }
  }

  func move(postId: String, to folderId: String?) async {
    guard !pendingPostIDs.contains(postId),
          let index = posts.firstIndex(where: { $0.id == postId }) else { return }

    let original = posts[index]
    posts[index] = original.movedBookmark(to: folderId)
    pendingPostIDs.insert(postId)
    error = nil
    defer { pendingPostIDs.remove(postId) }

    do {
      try await service.assignBookmark(postId: postId, folderId: folderId)
      await refreshFolders()
      if shouldRemovePostAfterMove(folderId: folderId) {
        posts.removeAll { $0.id == postId }
      }
    } catch {
      restore(original, at: index)
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
    guard !pendingPostIDs.contains(postId),
          let index = posts.firstIndex(where: { $0.id == postId }) else { return }

    let original = posts[index]
    guard let optimistic = original.votedPoll(optionIds: optionIds) else { return }

    posts[index] = optimistic
    pendingPostIDs.insert(postId)
    error = nil
    defer { pendingPostIDs.remove(postId) }

    do {
      try await service.votePoll(postId: postId, optionIds: optionIds)
    } catch {
      restore(original, at: index)
      self.error = error.localizedDescription
    }
  }

  func copyLink(postId: String) {
    UIPasteboard.general.string = "https://35mm.app/posts/\(postId)"
  }

  func clearSearch() {
    searchText = ""
  }

  func clearError() {
    error = nil
  }

  private var normalizedSearchText: String {
    searchText.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func normalizedFolderName(_ value: String) -> String {
    String(
      value
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .prefix(Self.folderNameLimit)
    )
  }

  private func refreshFolders() async {
    guard !isRefreshingFolders else { return }

    isRefreshingFolders = true
    defer { isRefreshingFolders = false }

    do {
      let response = try await service.fetchFolders()
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
    guard !pendingPostIDs.contains(postId),
          let index = posts.firstIndex(where: { $0.id == postId }) else { return }

    let original = posts[index]
    let requestEndpoint = endpoint(original)
    posts[index] = optimistic(original)
    pendingPostIDs.insert(postId)
    error = nil
    defer { pendingPostIDs.remove(postId) }

    do {
      try await service.performPostInteraction(requestEndpoint)
      if removeAfterSuccess, original.isBookmarked {
        posts.removeAll { $0.id == postId }
        await refreshFolders()
      }
    } catch {
      restore(original, at: index)
      self.error = error.localizedDescription
    }
  }

  private func restore(_ post: FeedPost, at originalIndex: Int) {
    if let currentIndex = posts.firstIndex(where: { $0.id == post.id }) {
      posts[currentIndex] = post
    } else {
      posts.insert(post, at: min(originalIndex, posts.count))
    }
  }

  private func appendDeduped(_ newPosts: [FeedPost]) {
    posts = FeedPost.deduplicating(posts + newPosts)
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
      false
    case .unsorted:
      folderId != nil
    case .folder(let folder):
      folder.id != folderId
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
      "all"
    case .unsorted:
      "unsorted"
    case .folder(let folder):
      "folder-\(folder.id)"
    }
  }

  var folderQueryValue: String? {
    switch self {
    case .all:
      nil
    case .unsorted:
      "none"
    case .folder(let folder):
      folder.id
    }
  }
}
