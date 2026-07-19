import Foundation

@MainActor
protocol ProfileServicing: AnyObject {
  func fetchProfile(username: String) async throws -> PublicProfile
  func fetchProfilePosts(username: String, cursor: String?, limit: Int) async throws -> PaginatedResponse<FeedPost>
  func fetchProfileStats(username: String) async throws -> ProfileStatsSummary
  func fetchProfileLists(username: String, cursor: String?, limit: Int) async throws -> PaginatedResponse<FilmListSummary>
  func updateProfile(_ request: ProfileMutation.UpdateRequest) async throws -> ProfileMutation.PublicProfilePatch
  func uploadProfileMedia(
    data: Data,
    contentType: String,
    kind: ProfileMutation.MediaKind,
    progress: @escaping @MainActor (Double) -> Void
  ) async throws -> String
  func follow(userId: String) async throws -> ProfileMutation.FollowResponse
  func unfollow(userId: String) async throws
  func setMuted(userId: String, muted: Bool) async throws
  func block(userId: String) async throws
  func setPostLike(postId: String, liked: Bool) async throws
  func setPostRepost(postId: String, reposted: Bool) async throws
  func setPostBookmark(postId: String, bookmarked: Bool) async throws
  func votePoll(postId: String, optionIds: [String]) async throws
}

extension APIClient: ProfileServicing {
  func fetchProfile(username: String) async throws -> PublicProfile {
    try await request(.getProfile(username: username))
  }

  func fetchProfilePosts(
    username: String,
    cursor: String?,
    limit: Int
  ) async throws -> PaginatedResponse<FeedPost> {
    try await request(.getProfilePosts(username: username, cursor: cursor, limit: limit))
  }

  func fetchProfileStats(username: String) async throws -> ProfileStatsSummary {
    try await request(.getProfileStats(username: username))
  }

  func fetchProfileLists(
    username: String,
    cursor: String?,
    limit: Int
  ) async throws -> PaginatedResponse<FilmListSummary> {
    try await request(.getProfileLists(username: username, cursor: cursor, limit: limit))
  }

  func updateProfile(
    _ requestBody: ProfileMutation.UpdateRequest
  ) async throws -> ProfileMutation.PublicProfilePatch {
    let response: ProfileMutation.UpdateResponse = try await request(.updateProfile(requestBody))
    return response.profile
  }

  func uploadProfileMedia(
    data: Data,
    contentType: String,
    kind: ProfileMutation.MediaKind,
    progress: @escaping @MainActor (Double) -> Void
  ) async throws -> String {
    let maximumBytes = 12 * 1_024 * 1_024
    guard data.count <= maximumBytes else {
      throw MediaUploadError.fileTooLarge(maximumMegabytes: 12)
    }

    let presign: MediaPresignResponse = try await request(.presignMediaUpload(
      kind: kind.rawValue,
      contentType: contentType,
      contentLength: data.count
    ))
    try await PresignedMediaUploader.upload(data: data, to: presign, progress: progress)
    return presign.publicUrl
  }

  func follow(userId: String) async throws -> ProfileMutation.FollowResponse {
    try await request(.followUser(userId: userId))
  }

  func unfollow(userId: String) async throws {
    try await requestVoid(.unfollowUser(userId: userId))
  }

  func setMuted(userId: String, muted: Bool) async throws {
    try await requestVoid(.setUserMuted(userId: userId, muted: muted))
  }

  func block(userId: String) async throws {
    try await requestVoid(.blockUser(userId: userId))
  }

  func setPostLike(postId: String, liked: Bool) async throws {
    let _: ProfileInteractionResponse = try await request(liked ? .likePost(postId) : .unlikePost(postId))
  }

  func setPostRepost(postId: String, reposted: Bool) async throws {
    let _: ProfileInteractionResponse = try await request(reposted ? .repostPost(postId) : .unrepostPost(postId))
  }

  func setPostBookmark(postId: String, bookmarked: Bool) async throws {
    let _: ProfileInteractionResponse = try await request(bookmarked ? .bookmarkPost(postId) : .unbookmarkPost(postId))
  }

  func votePoll(postId: String, optionIds: [String]) async throws {
    let _: FeedPost = try await request(.votePoll(postId: postId, optionIds: optionIds))
  }
}

private struct ProfileInteractionResponse: Decodable {
  let ok: Bool?
}

extension APIEndpoint {
  static func getProfile(username: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/profiles/\(username)", method: .get)
  }

  static func getProfilePosts(username: String, cursor: String?, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }
    return APIEndpoint(
      path: "/v1/feed/profiles/\(username)/posts",
      method: .get,
      queryItems: queryItems
    )
  }

  static func getProfileStats(username: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/profiles/\(username)/stats", method: .get)
  }

  static func getProfileLists(username: String, cursor: String?, limit: Int) -> APIEndpoint {
    var queryItems = [
      URLQueryItem(name: "limit", value: String(limit)),
      URLQueryItem(name: "sort", value: "updated"),
    ]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }
    return APIEndpoint(
      path: "/v1/lists/profile/\(username)",
      method: .get,
      queryItems: queryItems
    )
  }

  static func updateProfile(_ request: ProfileMutation.UpdateRequest) -> APIEndpoint {
    APIEndpoint(path: "/v1/profiles/me", method: .patch, body: request)
  }

  static func followUser(userId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/follows/\(userId)", method: .post)
  }

  static func unfollowUser(userId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/follows/\(userId)", method: .delete)
  }

  static func setUserMuted(userId: String, muted: Bool) -> APIEndpoint {
    APIEndpoint(path: "/v1/users/\(userId)/mute", method: muted ? .post : .delete)
  }

  static func blockUser(userId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/users/\(userId)/block", method: .post)
  }
}
