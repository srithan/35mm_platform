import Foundation

struct UserSettings: Codable, Equatable {
  var profile: ProfileSettings
  var privacy: PrivacySettings
  var notifications: NotificationSettings
  var appearance: AppearanceSettings
  var media: MediaSettings
}

struct ProfileSettings: Codable, Equatable {
  var displayName: String
  var username: String
  var email: String
}

struct PrivacySettings: Codable, Equatable {
  var privateAccount: Bool
  var allowMessagesFromAnyone: Bool
  var showActivityStatus: Bool
}

struct NotificationSettings: Codable, Equatable {
  var newFollowers: Bool
  var likesOnPosts: Bool
  var commentsAndReplies: Bool
  var mentions: Bool
  var festivalUpdates: Bool
  var watchlistStreaming: Bool
  var emailDigest: Bool
  var emailPreferences: NotificationEmailPreferences
}

struct NotificationEmailPreferences: Codable, Equatable {
  var likesOnPosts: Bool
  var repostsOnPosts: Bool
  var newFollowers: Bool
  var followRequests: Bool
  var followRequestApproved: Bool
  var comments: Bool
  var replies: Bool
  var mentions: Bool
  var filmLogged: Bool
}

struct AppearanceSettings: Codable, Equatable {
  var theme: String
  var accentColor: String
  var videoAutoplay: Bool
}

struct MediaSettings: Codable, Equatable {
  var videoDefaultQuality: String
  var videoAutoplay: Bool
  var alwaysShowCaptions: Bool
  var captionStyle: String
  var quietMode: Bool
}

struct ModeratedUser: Codable, Identifiable, Equatable {
  let userId: String
  let username: String
  let displayName: String
  let bio: String?
  let avatarUrl: String?
  let avatarUrlLg: String?

  var id: String { userId }
}

struct ModeratedUsersPage: Codable, Equatable {
  let items: [ModeratedUser]
  let nextCursor: String?
  let hasMore: Bool
}

struct UsernameAvailabilityResponse: Codable, Equatable {
  let available: Bool
  let reason: String?
}

struct EmptyResponse: Codable {}

