import Foundation

enum ProfileMutation {
  enum MediaKind: String, Sendable {
    case avatar
    case cover
  }

  struct UpdateRequest: Encodable, Equatable {
    var displayName: String?
    var bio: String?
    var avatarUrl: String?
    var shouldClearAvatar = false
    var coverUrl: String?
    var shouldClearCover = false
    var location: String?
    var website: String?
    var shouldClearWebsite = false
    var dateOfBirth: String?
    var shouldClearDateOfBirth = false
    var role: String?
    var roleContext: String?
    var shouldClearRoleContext = false
    var headline: String?
    var headlineContext: String?
    var shouldClearHeadlineContext = false

    enum CodingKeys: String, CodingKey {
      case displayName
      case bio
      case avatarUrl
      case coverUrl
      case location
      case website
      case dateOfBirth
      case role
      case roleContext
      case headline
      case headlineContext
    }

    func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      try container.encodeIfPresent(displayName, forKey: .displayName)
      try container.encodeIfPresent(bio, forKey: .bio)
      if shouldClearAvatar {
        try container.encodeNil(forKey: .avatarUrl)
      } else {
        try container.encodeIfPresent(avatarUrl, forKey: .avatarUrl)
      }
      if shouldClearCover {
        try container.encodeNil(forKey: .coverUrl)
      } else {
        try container.encodeIfPresent(coverUrl, forKey: .coverUrl)
      }
      try container.encodeIfPresent(location, forKey: .location)
      if shouldClearWebsite {
        try container.encodeNil(forKey: .website)
      } else {
        try container.encodeIfPresent(website, forKey: .website)
      }
      if shouldClearDateOfBirth {
        try container.encodeNil(forKey: .dateOfBirth)
      } else {
        try container.encodeIfPresent(dateOfBirth, forKey: .dateOfBirth)
      }
      try container.encodeIfPresent(role, forKey: .role)
      if shouldClearRoleContext {
        try container.encodeNil(forKey: .roleContext)
      } else {
        try container.encodeIfPresent(roleContext, forKey: .roleContext)
      }
      try container.encodeIfPresent(headline, forKey: .headline)
      if shouldClearHeadlineContext {
        try container.encodeNil(forKey: .headlineContext)
      } else {
        try container.encodeIfPresent(headlineContext, forKey: .headlineContext)
      }
    }
  }

  struct UpdateResponse: Decodable {
    let ok: Bool
    let message: String?
    let profile: PublicProfilePatch
  }

  struct PublicProfilePatch: Decodable, Equatable {
    let userId: String
    let username: String
    let displayName: String
    let bio: String?
    let avatarUrl: String?
    let avatarUrlLg: String?
    let coverUrl: String?
    let location: String?
    let website: String?
    let dateOfBirth: String?
    let role: String?
    let roleContext: String?
    let headline: String?
    let headlineContext: String?
  }

  struct FollowResponse: Decodable {
    let ok: Bool
    let isFollowing: Bool
    let status: String
  }
}
