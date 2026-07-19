import Foundation
import Testing
@testable import ThirtyFiveMM

@MainActor
struct BookmarksViewModelTests {
  @Test
  func testInitialLoadUsesCursorPageAndDenormalizedFolderCounts() async throws {
    let service = BookmarkServiceStub()
    let post = try makePost(id: "post-1", body: "A perfect closing shot")
    service.foldersResponse = BookmarkFoldersResponse(
      folders: [makeFolder(id: "folder-1", name: "Craft", count: 4)],
      unsortedCount: 3
    )
    service.pages[nil] = PaginatedResponse(
      items: [post],
      nextCursor: "cursor-1",
      hasMore: true
    )
    let viewModel = BookmarksViewModel(service: service, pageLimit: 1)

    await viewModel.loadInitial()

    #expect(viewModel.posts.map(\.id) == ["post-1"])
    #expect(viewModel.selectedCount == 7)
    #expect(viewModel.hasMore)
    #expect(service.bookmarkRequests.first?.limit == 1)
    #expect(service.bookmarkRequests.first?.folderId == nil)
  }

  @Test
  func testLoadMoreDeduplicatesCursorResults() async throws {
    let service = BookmarkServiceStub()
    let first = try makePost(id: "post-1", body: "First")
    let second = try makePost(id: "post-2", body: "Second")
    service.pages[nil] = PaginatedResponse(
      items: [first],
      nextCursor: "cursor-1",
      hasMore: true
    )
    service.pages["cursor-1"] = PaginatedResponse(
      items: [first, second],
      nextCursor: nil,
      hasMore: false
    )
    let viewModel = BookmarksViewModel(service: service, pageLimit: 2)

    await viewModel.loadInitial()
    await viewModel.loadMore()

    #expect(viewModel.posts.map(\.id) == ["post-1", "post-2"])
    #expect(!viewModel.hasMore)
    #expect(service.bookmarkRequests.map(\.cursor) == [nil, "cursor-1"])
  }

  @Test
  func testSearchUsesLocalizedMatchingAcrossLoadedPostMetadata() async throws {
    let service = BookmarkServiceStub()
    service.pages[nil] = PaginatedResponse(
      items: [try makePost(id: "post-1", body: "Amélie color palette")],
      nextCursor: nil,
      hasMore: false
    )
    let viewModel = BookmarksViewModel(service: service)
    await viewModel.loadInitial()

    viewModel.searchText = "amelie"

    #expect(viewModel.visiblePosts.map(\.id) == ["post-1"])
  }

  @Test
  func testRapidFolderSelectionCannotApplyStaleResponse() async throws {
    let folder = makeFolder(id: "folder-1", name: "Craft", count: 1)
    let service = BookmarkServiceStub()
    service.foldersResponse = BookmarkFoldersResponse(folders: [folder], unsortedCount: 1)
    service.pages[nil] = PaginatedResponse(
      items: [try makePost(id: "all-post", body: "All")],
      nextCursor: nil,
      hasMore: false
    )
    service.pages[folder.id] = PaginatedResponse(
      items: [try makePost(id: "folder-post", body: "Folder", folderId: folder.id)],
      nextCursor: nil,
      hasMore: false
    )
    service.bookmarkDelays[nil] = .milliseconds(120)
    let viewModel = BookmarksViewModel(service: service)

    let initialLoad = Task { await viewModel.loadInitial() }
    try await Task.sleep(for: .milliseconds(10))
    viewModel.selectFilter(.folder(folder))
    await initialLoad.value
    try await Task.sleep(for: .milliseconds(160))

    #expect(viewModel.selectedFilter.id == BookmarkFilter.folder(folder).id)
    #expect(viewModel.posts.map(\.id) == ["folder-post"])
  }

  @Test
  func testMovingBookmarkRemovesItFromPreviousFolderAndRefreshesCounts() async throws {
    let source = makeFolder(id: "source", name: "Source", count: 1)
    let target = makeFolder(id: "target", name: "Target", count: 0)
    let service = BookmarkServiceStub()
    service.foldersResponse = BookmarkFoldersResponse(folders: [source, target], unsortedCount: 0)
    service.pages["source"] = PaginatedResponse(
      items: [try makePost(id: "post-1", body: "Move me", folderId: "source")],
      nextCursor: nil,
      hasMore: false
    )
    let viewModel = BookmarksViewModel(service: service)
    viewModel.selectedFilter = .folder(source)
    await viewModel.loadInitial()

    service.foldersResponse = BookmarkFoldersResponse(
      folders: [
        makeFolder(id: "source", name: "Source", count: 0),
        makeFolder(id: "target", name: "Target", count: 1),
      ],
      unsortedCount: 0
    )
    await viewModel.move(postId: "post-1", to: "target")

    #expect(viewModel.posts.isEmpty)
    #expect(service.assignments.first?.postId == "post-1")
    #expect(service.assignments.first?.folderId == "target")
    #expect(viewModel.folders.first(where: { $0.id == "target" })?.itemCount == 1)
  }

  @Test
  func testFailedBookmarkMoveRestoresOptimisticState() async throws {
    let folder = makeFolder(id: "source", name: "Source", count: 1)
    let service = BookmarkServiceStub()
    service.foldersResponse = BookmarkFoldersResponse(folders: [folder], unsortedCount: 0)
    service.pages["source"] = PaginatedResponse(
      items: [try makePost(id: "post-1", body: "Keep me", folderId: "source")],
      nextCursor: nil,
      hasMore: false
    )
    service.assignError = TestFailure.expected
    let viewModel = BookmarksViewModel(service: service)
    viewModel.selectedFilter = .folder(folder)
    await viewModel.loadInitial()

    await viewModel.move(postId: "post-1", to: nil)

    #expect(viewModel.posts.first?.bookmarkFolderId == "source")
    #expect(viewModel.error != nil)
    #expect(viewModel.pendingPostIDs.isEmpty)
  }

  @Test
  func testCreateFolderTrimsAndLimitsNameBeforeMutation() async {
    let service = BookmarkServiceStub()
    let viewModel = BookmarksViewModel(service: service)
    let overlongName = "  \(String(repeating: "A", count: 100))  "

    let didCreate = await viewModel.createFolder(name: overlongName)

    #expect(didCreate)
    #expect(service.createdNames.first?.count == BookmarksViewModel.folderNameLimit)
    #expect(viewModel.selectedFolder?.name.count == BookmarksViewModel.folderNameLimit)
  }

  private func makeFolder(id: String, name: String, count: Int) -> BookmarkFolder {
    BookmarkFolder(
      id: id,
      name: name,
      itemCount: count,
      createdAt: .distantPast,
      updatedAt: .distantPast
    )
  }

  private func makePost(
    id: String,
    body: String,
    folderId: String? = nil
  ) throws -> FeedPost {
    var payload: [String: Any] = [
      "id": id,
      "type": "text",
      "body": body,
      "createdAt": "2026-07-17T12:00:00Z",
      "visibility": "public",
      "isBookmarked": true,
      "author": [
        "id": "user-1",
        "username": "maya.frames",
        "displayName": "Maya Frames",
      ],
    ]
    if let folderId {
      payload["bookmarkFolderId"] = folderId
    }

    let data = try JSONSerialization.data(withJSONObject: payload)
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return try decoder.decode(FeedPost.self, from: data)
  }
}

@MainActor
private final class BookmarkServiceStub: BookmarkServicing {
  struct BookmarkRequest {
    let cursor: String?
    let limit: Int
    let folderId: String?
  }

  struct Assignment {
    let postId: String
    let folderId: String?
  }

  var foldersResponse = BookmarkFoldersResponse(folders: [], unsortedCount: 0)
  var pages: [String?: PaginatedResponse<FeedPost>] = [:]
  var bookmarkRequests: [BookmarkRequest] = []
  var assignments: [Assignment] = []
  var createdNames: [String] = []
  var bookmarkDelays: [String?: Duration] = [:]
  var assignError: Error?

  func fetchFolders() async throws -> BookmarkFoldersResponse {
    foldersResponse
  }

  func fetchBookmarks(
    cursor: String?,
    limit: Int,
    folderId: String?
  ) async throws -> PaginatedResponse<FeedPost> {
    bookmarkRequests.append(BookmarkRequest(cursor: cursor, limit: limit, folderId: folderId))
    if let delay = bookmarkDelays[folderId] {
      try await Task.sleep(for: delay)
    }
    return pages[folderId ?? cursor] ?? PaginatedResponse(items: [], nextCursor: nil, hasMore: false)
  }

  func createFolder(name: String) async throws -> BookmarkFolder {
    createdNames.append(name)
    let folder = BookmarkFolder(
      id: "created-folder",
      name: name,
      itemCount: 0,
      createdAt: .distantPast,
      updatedAt: .distantPast
    )
    foldersResponse = BookmarkFoldersResponse(
      folders: [folder] + foldersResponse.folders,
      unsortedCount: foldersResponse.unsortedCount
    )
    return folder
  }

  func renameFolder(id: String, name: String) async throws -> BookmarkFolder {
    BookmarkFolder(
      id: id,
      name: name,
      itemCount: 0,
      createdAt: .distantPast,
      updatedAt: .distantPast
    )
  }

  func deleteFolder(id: String) async throws {}

  func assignBookmark(postId: String, folderId: String?) async throws {
    assignments.append(Assignment(postId: postId, folderId: folderId))
    if let assignError { throw assignError }
  }

  func performPostInteraction(_ endpoint: APIEndpoint) async throws {}
  func votePoll(postId: String, optionIds: [String]) async throws {}
}

private enum TestFailure: Error {
  case expected
}
