import Foundation

struct AuthBootstrap {
  @MainActor
  static func bootstrap(apiClient: APIClient) async throws -> UserProfile {
    try await apiClient.request(.getMe())
  }
}
