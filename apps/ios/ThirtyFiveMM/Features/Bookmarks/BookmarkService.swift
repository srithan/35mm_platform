import Foundation

@MainActor
final class BookmarkService: BookmarkServicing {
  private let apiClient: APIClient

  init(apiClient: APIClient) {
    self.apiClient = apiClient
  }

  func fetchFolders() async throws -> BookmarkFoldersResponse {
    try await apiClient.request(.getBookmarkFolders())
  }

  func fetchBookmarks(
    cursor: String?,
    limit: Int,
    folderId: String?
  ) async throws -> PaginatedResponse<FeedPost> {
    try await apiClient.request(
      .getBookmarks(cursor: cursor, limit: limit, folderId: folderId)
    )
  }

  func createFolder(name: String) async throws -> BookmarkFolder {
    let response: BookmarkFolderResponse = try await apiClient.request(
      .createBookmarkFolder(name: name)
    )
    return response.folder
  }

  func renameFolder(id: String, name: String) async throws -> BookmarkFolder {
    let response: BookmarkFolderResponse = try await apiClient.request(
      .updateBookmarkFolder(folderId: id, name: name)
    )
    return response.folder
  }

  func deleteFolder(id: String) async throws {
    try await apiClient.requestVoid(.deleteBookmarkFolder(folderId: id))
  }

  func assignBookmark(postId: String, folderId: String?) async throws {
    let _: InteractionResponse = try await apiClient.request(
      .assignBookmark(postId: postId, folderId: folderId)
    )
  }

  func performPostInteraction(_ endpoint: APIEndpoint) async throws {
    let _: InteractionResponse = try await apiClient.request(endpoint)
  }

  func votePoll(postId: String, optionIds: [String]) async throws {
    let _: FeedPost = try await apiClient.request(
      .votePoll(postId: postId, optionIds: optionIds)
    )
  }
}

private extension BookmarkService {
  struct InteractionResponse: Decodable {
    let ok: Bool?
    let folderId: String?
    let isBookmarked: Bool?
    let bookmarkCount: Int?
  }
}
