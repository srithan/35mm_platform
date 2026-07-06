import Foundation

enum HTTPMethod: String {
  case get = "GET"
  case post = "POST"
  case patch = "PATCH"
  case delete = "DELETE"
}

struct APIEndpoint {
  let path: String
  let method: HTTPMethod
  let body: Encodable?
  let queryItems: [URLQueryItem]

  init(
    path: String,
    method: HTTPMethod,
    body: Encodable? = nil,
    queryItems: [URLQueryItem] = []
  ) {
    self.path = path
    self.method = method
    self.body = body
    self.queryItems = queryItems
  }
}

extension APIEndpoint {
  static func getMe() -> APIEndpoint {
    APIEndpoint(path: "/v1/me", method: .get)
  }

  static func getOnboardingStatus() -> APIEndpoint {
    APIEndpoint(path: "/v1/me/onboarding-status", method: .get)
  }

  static func checkUsernameAvailability(_ username: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/usernames/\(username)/available", method: .get)
  }

  static func getOnboardingSuggestions() -> APIEndpoint {
    APIEndpoint(path: "/v1/onboarding/suggestions", method: .get)
  }

  static func submitOnboarding(_ input: SubmitOnboardingRequest) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/onboarding", method: .post, body: input)
  }

  static func getFeed(cursor: String?, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }

    return APIEndpoint(path: "/v1/feed", method: .get, queryItems: queryItems)
  }

  static func getBookmarks(cursor: String?, limit: Int, folderId: String?) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }
    if let folderId {
      queryItems.append(URLQueryItem(name: "folderId", value: folderId))
    }

    return APIEndpoint(path: "/v1/feed/bookmarks", method: .get, queryItems: queryItems)
  }

  static func getBookmarkFolders() -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/bookmarks/folders", method: .get)
  }

  static func createBookmarkFolder(name: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/bookmarks/folders", method: .post, body: BookmarkFolderNameRequest(name: name))
  }

  static func updateBookmarkFolder(folderId: String, name: String) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/feed/bookmarks/folders/\(folderId)",
      method: .patch,
      body: BookmarkFolderNameRequest(name: name)
    )
  }

  static func deleteBookmarkFolder(folderId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/bookmarks/folders/\(folderId)", method: .delete)
  }

  static func getPost(_ postId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)", method: .get)
  }

  static func likePost(_ postId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/likes", method: .post)
  }

  static func unlikePost(_ postId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/likes", method: .delete)
  }

  static func repostPost(_ postId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/reposts", method: .post)
  }

  static func unrepostPost(_ postId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/reposts", method: .delete)
  }

  static func bookmarkPost(_ postId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/bookmarks", method: .post)
  }

  static func unbookmarkPost(_ postId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/bookmarks", method: .delete)
  }

  static func assignBookmark(postId: String, folderId: String?) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/feed/posts/\(postId)/bookmarks",
      method: .patch,
      body: BookmarkFolderAssignRequest(folderId: folderId)
    )
  }

  static func votePoll(postId: String, optionIds: [String]) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/feed/posts/\(postId)/poll/votes",
      method: .post,
      body: VotePollRequest(optionIds: optionIds)
    )
  }

  static func getComments(postId: String, cursor: String?, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }

    return APIEndpoint(
      path: "/v1/feed/posts/\(postId)/comments",
      method: .get,
      queryItems: queryItems
    )
  }

  static func postComment(postId: String, body: String, parentId: String?) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/feed/posts/\(postId)/comments",
      method: .post,
      body: CreateCommentRequest(body: body, parentId: parentId)
    )
  }

  static func likeComment(postId: String, commentId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/comments/\(commentId)/likes", method: .post)
  }

  static func unlikeComment(postId: String, commentId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/feed/posts/\(postId)/comments/\(commentId)/likes", method: .delete)
  }

  static func getNotifications(cursor: String?, limit: Int, unreadOnly: Bool) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }
    if unreadOnly {
      queryItems.append(URLQueryItem(name: "unreadOnly", value: "true"))
    }

    return APIEndpoint(path: "/v1/me/notifications", method: .get, queryItems: queryItems)
  }

  static func markNotificationRead(_ notificationId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/notifications/\(notificationId)/read", method: .patch)
  }

  static func markNotificationUnread(_ notificationId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/notifications/\(notificationId)/unread", method: .patch)
  }

  static func markAllNotificationsRead() -> APIEndpoint {
    APIEndpoint(path: "/v1/me/notifications/read-all", method: .post)
  }

  static func getFollowRequests(cursor: String?, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }

    return APIEndpoint(path: "/v1/follows/requests/received", method: .get, queryItems: queryItems)
  }

  static func acceptFollowRequest(_ requesterId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/follows/\(requesterId)/accept", method: .post)
  }

  static func declineFollowRequest(_ requesterId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/follows/\(requesterId)/request", method: .delete)
  }
}

struct AnyEncodable: Encodable {
  private let encodeValue: (Encoder) throws -> Void

  init(_ value: Encodable) {
    encodeValue = value.encode
  }

  func encode(to encoder: Encoder) throws {
    try encodeValue(encoder)
  }
}

private struct CreateCommentRequest: Encodable {
  let body: String
  let parentId: String?
}

private struct VotePollRequest: Encodable {
  let optionIds: [String]
}

private struct BookmarkFolderNameRequest: Encodable {
  let name: String
}

private struct BookmarkFolderAssignRequest: Encodable {
  let folderId: String?
}

struct SubmitOnboardingRequest: Encodable {
  let role: String
  let headlineContext: String?
  let favoriteFilmIds: [String]
  let favoriteGenreIds: [String]
  let followUserIds: [String]
}
