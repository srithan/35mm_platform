import Foundation

struct FilmListSummary: Codable, Identifiable, Equatable {
  struct Owner: Codable, Identifiable, Equatable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
    let role: String?
    let roleContext: String?
    let filmsLoggedCount: Int?
  }

  enum ListType: String, Codable {
    case custom
    case watchlist
  }

  enum Visibility: String, Codable {
    case `public`
    case `private`
  }

  let id: String
  let userId: String
  let type: ListType
  let title: String
  let description: String?
  let visibility: Visibility
  let isRanked: Bool
  let tags: [String]
  let shareSlug: String
  let likeCount: Int
  let commentCount: Int
  let entryCount: Int
  let isLiked: Bool
  let isOwner: Bool
  let createdAt: Date
  let updatedAt: Date
  let owner: Owner
  let posterUrls: [String?]
}
