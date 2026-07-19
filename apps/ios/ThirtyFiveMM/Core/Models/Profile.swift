import Foundation

struct UserProfile: Codable, Identifiable {
  let userId: String
  let username: String
  let displayName: String?
  let avatarUrl: String?
  let avatarUrlLg: String?
  let role: String?
  let roleContext: String?
  let filmsLoggedCount: Int
  let followerCount: Int
  let followingCount: Int

  var id: String {
    userId
  }

  init(profile: PublicProfile) {
    userId = profile.userId
    username = profile.username
    displayName = profile.displayName
    avatarUrl = profile.avatarUrl
    avatarUrlLg = profile.avatarUrlLg
    role = profile.role
    roleContext = profile.roleContext
    filmsLoggedCount = profile.filmsLoggedCount
    followerCount = profile.followerCount
    followingCount = profile.followingCount
  }
}

struct OnboardingStatus: Codable {
  let completed: Bool
  let completedAt: Date?
}

struct UsernameAvailability: Codable {
  let available: Bool
  let reason: String?
}

struct OnboardingSuggestionUser: Codable, Identifiable {
  let id: String
  let username: String
  let displayName: String
  let avatarUrl: String?
  let role: String?
  let roleContext: String?
  let filmsLoggedCount: Int
  let followerCount: Int
}

struct OnboardingSuggestionsResponse: Codable {
  let users: [OnboardingSuggestionUser]
}

struct OnboardingSubmitResponse: Codable {
  let ok: Bool
}
