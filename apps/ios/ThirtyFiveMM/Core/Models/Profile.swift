import Foundation

struct Profile: Codable, Identifiable {
  let id: String
  let username: String
  let displayName: String?
  let bio: String?
  let avatarUrl: String?
  let coverUrl: String?
  let isPrivate: Bool
  let followersCount: Int
  let followingCount: Int
  let filmsLoggedCount: Int
  let followState: String?
}

struct UserProfile: Codable, Identifiable {
  let userId: String
  let username: String
  let displayName: String?
  let avatarUrl: String?
  let avatarUrlLg: String?
  let role: String?
  let roleContext: String?
  let filmsLoggedCount: Int

  var id: String {
    userId
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
