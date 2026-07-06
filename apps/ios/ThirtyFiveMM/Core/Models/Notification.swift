import Foundation

enum NotificationType: String, Codable {
  case like
  case comment
  case reply
  case follow
  case followRequest = "follow_request"
  case followRequestApproved = "follow_request_approved"
  case mention
  case repost
  case filmLogged = "film_logged"
  case chatReaction = "chat_reaction"
}

struct NotificationActor: Codable, Identifiable, Equatable {
  let id: String
  let username: String
  let displayName: String
  let avatarUrl: String?
  let avatarUrlLg: String?
}

struct NotificationActorProfile: Codable, Identifiable, Equatable {
  let userId: String
  let username: String
  let displayName: String?
  let avatarUrl: String?
  let avatarUrlLg: String?

  var id: String {
    userId
  }
}

struct NotificationEntity: Codable, Equatable {
  enum Kind: String, Codable {
    case post
    case comment
    case user
    case film
    case chatThread = "chat_thread"
  }

  let type: Kind?
  let id: String?
  let title: String?
  let thumbnailUrl: String?
  let username: String?
  let postId: String?
}

struct NotificationItem: Codable, Identifiable, Equatable {
  let id: String
  let type: NotificationType
  let actor: NotificationActor?
  let entity: NotificationEntity?
  let isRead: Bool
  let actorIds: [String]?
  let actorProfiles: [NotificationActorProfile]?
  let bundleCount: Int
  let createdAt: Date

  var destinationPostId: String? {
    guard let entity else { return nil }

    switch entity.type {
    case .post:
      return entity.id
    case .comment:
      return entity.postId
    case .chatThread, .film, .user, nil:
      return nil
    }
  }

  func withReadState(_ value: Bool) -> NotificationItem {
    NotificationItem(
      id: id,
      type: type,
      actor: actor,
      entity: entity,
      isRead: value,
      actorIds: actorIds,
      actorProfiles: actorProfiles,
      bundleCount: bundleCount,
      createdAt: createdAt
    )
  }
}

struct NotificationPage: Decodable {
  let items: [NotificationItem]
  let nextCursor: String?
  let hasMore: Bool
}

struct FollowRequestPage: Decodable {
  let requests: [FollowRequest]
  let total: Int
  let hasMore: Bool
  let nextCursor: String?
}

struct FollowRequest: Decodable, Identifiable, Equatable {
  let requesterId: String
  let username: String
  let displayName: String?
  let avatarUrl: String?
  let avatarUrlLg: String?
  let mutualFollowerCount: Int
  let requestedAt: Date

  var id: String {
    requesterId
  }
}
