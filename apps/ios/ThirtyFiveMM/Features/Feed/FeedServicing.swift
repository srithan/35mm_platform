import Foundation

@MainActor
protocol FeedServicing: AnyObject {
  func fetchFeed(cursor: String?, limit: Int) async throws -> PaginatedResponse<FeedPost>
  func performPostInteraction(_ endpoint: APIEndpoint) async throws
  func votePoll(postId: String, optionIds: [String]) async throws
}

@MainActor
final class FeedService: FeedServicing {
  private let apiClient: APIClient

  init(apiClient: APIClient) {
    self.apiClient = apiClient
  }

  func fetchFeed(cursor: String?, limit: Int) async throws -> PaginatedResponse<FeedPost> {
    try await apiClient.request(.getFeed(cursor: cursor, limit: limit))
  }

  func performPostInteraction(_ endpoint: APIEndpoint) async throws {
    let _: FeedInteractionResponse = try await apiClient.request(endpoint)
  }

  func votePoll(postId: String, optionIds: [String]) async throws {
    let _: FeedPost = try await apiClient.request(.votePoll(postId: postId, optionIds: optionIds))
  }
}

private struct FeedInteractionResponse: Decodable {
  let ok: Bool?
  let likeCount: Int?
  let folderId: String?
}
