import Foundation

@MainActor
protocol FollowRequestServicing: AnyObject {
  func fetchFollowRequests(cursor: String?, limit: Int) async throws -> FollowRequestPage
  func acceptFollowRequest(requesterId: String) async throws
  func declineFollowRequest(requesterId: String) async throws
}

extension APIClient: FollowRequestServicing {
  func fetchFollowRequests(cursor: String?, limit: Int) async throws -> FollowRequestPage {
    try await request(.getFollowRequests(cursor: cursor, limit: limit))
  }

  func acceptFollowRequest(requesterId: String) async throws {
    try await requestVoid(.acceptFollowRequest(requesterId))
  }

  func declineFollowRequest(requesterId: String) async throws {
    try await requestVoid(.declineFollowRequest(requesterId))
  }
}
