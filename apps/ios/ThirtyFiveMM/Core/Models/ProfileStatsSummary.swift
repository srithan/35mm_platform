import Foundation

struct ProfileStatsSummary: Codable, Equatable {
  struct Film: Codable, Identifiable, Equatable {
    let id: String
    let tmdbId: Int?
    let imdbId: String?
    let title: String
    let year: Int?
    let posterUrl: String?
  }

  struct Genre: Codable, Identifiable, Equatable {
    let name: String
    let count: Int
    let percentage: Double

    var id: String { name }
  }

  struct ActivityDay: Codable, Identifiable, Equatable {
    let date: String
    let count: Int

    var id: String { date }
  }

  struct DiaryEntry: Codable, Identifiable, Equatable {
    let postId: String
    let type: PostType
    let createdAt: Date
    let rating: Double?
    let film: Film

    var id: String { postId }
  }

  let username: String
  let filmsLoggedCount: Int
  let hoursWatched: Int
  let averageRating: Double?
  let reviewsWrittenCount: Int
  let reviewLikeCount: Int
  let memberSince: Date?
  let favoriteFilms: [Film]
  let genres: [Genre]
  let activity: [ActivityDay]
  let recentDiary: [DiaryEntry]
  let cachedAt: Date
}
