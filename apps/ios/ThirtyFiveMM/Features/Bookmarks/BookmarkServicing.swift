import Foundation

@MainActor
protocol BookmarkServicing: AnyObject {
  func fetchFolders() async throws -> BookmarkFoldersResponse
  func fetchBookmarks(cursor: String?, limit: Int, folderId: String?) async throws -> PaginatedResponse<FeedPost>
  func createFolder(name: String) async throws -> BookmarkFolder
  func renameFolder(id: String, name: String) async throws -> BookmarkFolder
  func deleteFolder(id: String) async throws
  func assignBookmark(postId: String, folderId: String?) async throws
  func performPostInteraction(_ endpoint: APIEndpoint) async throws
  func votePoll(postId: String, optionIds: [String]) async throws
}
