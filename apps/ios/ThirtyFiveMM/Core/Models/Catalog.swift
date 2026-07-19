import Foundation

struct CatalogMedia: Decodable, Identifiable, Equatable {
  let id: String
  let type: String
  let url: String
  let title: String?
  let caption: String?
  let attribution: String?
  let isPrimary: Bool
}

struct CatalogTitle: Decodable, Identifiable, Hashable {
  let id: String
  let type: String
  let primaryTitle: String
  let originalTitle: String?
  let slug: String
  let startYear: Int?
  let endYear: Int?
  let releaseDate: String?
  let runtimeMinutes: Int?
  let primaryLanguage: String?
  let primaryCountry: String?
  let isVerified: Bool
  let primaryMedia: CatalogMedia?

  static func == (lhs: CatalogTitle, rhs: CatalogTitle) -> Bool {
    lhs.id == rhs.id
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  var yearText: String? {
    guard let startYear else { return nil }
    if let endYear, endYear != startYear {
      return "\(startYear)–\(endYear)"
    }
    return String(startYear)
  }

  var kindLabel: String {
    switch type {
    case "movie": return "Film"
    case "short_film": return "Short film"
    case "documentary": return "Documentary"
    case "tv_series": return "TV series"
    case "web_series": return "Web series"
    case "tv_season": return "Season"
    case "tv_episode": return "Episode"
    case "tv_special": return "TV special"
    default: return "Title"
    }
  }
}

struct CatalogTitleDetail: Decodable, Identifiable, Equatable {
  let id: String
  let type: String
  let primaryTitle: String
  let originalTitle: String?
  let slug: String
  let startYear: Int?
  let endYear: Int?
  let releaseDate: String?
  let runtimeMinutes: Int?
  let primaryLanguage: String?
  let primaryCountry: String?
  let isVerified: Bool
  let primaryMedia: CatalogMedia?
  let legacyFilmId: String?
  let synopsis: String?
  let originCountries: [String]
  let spokenLanguages: [String]
  let seasonNumber: Int?
  let episodeNumber: Int?
  let externalIds: [CatalogExternalID]

  var card: CatalogTitle {
    CatalogTitle(
      id: id,
      type: type,
      primaryTitle: primaryTitle,
      originalTitle: originalTitle,
      slug: slug,
      startYear: startYear,
      endYear: endYear,
      releaseDate: releaseDate,
      runtimeMinutes: runtimeMinutes,
      primaryLanguage: primaryLanguage,
      primaryCountry: primaryCountry,
      isVerified: isVerified,
      primaryMedia: primaryMedia
    )
  }

  var imdbURL: URL? {
    guard let item = externalIds.first(where: { $0.provider == "imdb" }) else { return nil }
    if let value = item.url, let url = URL(string: value) { return url }
    return URL(string: "https://www.imdb.com/title/\(item.externalId)")
  }
}

struct CatalogExternalID: Decodable, Identifiable, Equatable {
  let id: String
  let provider: String
  let externalId: String
  let url: String?
  let isPrimary: Bool
}

struct CatalogPerson: Decodable, Identifiable, Equatable {
  let id: String
  let primaryName: String
  let primaryProfessions: [String]
  let isVerified: Bool
  let primaryMedia: CatalogMedia?
}

struct CatalogCredit: Decodable, Identifiable, Equatable {
  let id: String
  let department: String
  let job: String
  let characterName: String?
  let creditedAs: String?
  let billingOrder: Int
  let episodeCount: Int?
  let person: CatalogPerson?

  var roleText: String {
    if let characterName, !characterName.isEmpty { return characterName }
    return job
  }

  var departmentLabel: String {
    department.replacingOccurrences(of: "_", with: " ").capitalized
  }
}

struct WatchlistStatus: Decodable, Equatable {
  let filmId: String
  let isInWatchlist: Bool
  let watchlistId: String?
  let entryId: String?
}

struct WatchlistMutationResponse: Decodable {
  let filmId: String?
  let isInWatchlist: Bool
  let watchlistId: String?
  let entryId: String?
}

struct TMDBDiscoverPage: Decodable, Sendable {
  let results: [TMDBDiscoverTitle]
}

struct TMDBDiscoverTitle: Decodable, Hashable, Identifiable, Sendable {
  let tmdbId: Int
  let title: String?
  let name: String?
  let overview: String?
  let posterPath: String?
  let backdropPath: String?
  let releaseDate: String?
  let firstAirDate: String?
  let genreIds: [Int]
  let voteAverage: Double
  let mediaType: String?

  enum CodingKeys: String, CodingKey {
    case tmdbId = "id"
    case title
    case name
    case overview
    case posterPath
    case backdropPath
    case releaseDate
    case firstAirDate
    case genreIds
    case voteAverage
    case mediaType
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    tmdbId = try container.decode(Int.self, forKey: .tmdbId)
    title = try container.decodeIfPresent(String.self, forKey: .title)
    name = try container.decodeIfPresent(String.self, forKey: .name)
    overview = try container.decodeIfPresent(String.self, forKey: .overview)
    posterPath = try container.decodeIfPresent(String.self, forKey: .posterPath)
    backdropPath = try container.decodeIfPresent(String.self, forKey: .backdropPath)
    releaseDate = try container.decodeIfPresent(String.self, forKey: .releaseDate)
    firstAirDate = try container.decodeIfPresent(String.self, forKey: .firstAirDate)
    genreIds = try container.decodeIfPresent([Int].self, forKey: .genreIds) ?? []
    voteAverage = try container.decodeIfPresent(Double.self, forKey: .voteAverage) ?? 0
    mediaType = try container.decodeIfPresent(String.self, forKey: .mediaType)
  }

  init(
    tmdbId: Int,
    title: String?,
    name: String?,
    overview: String?,
    posterPath: String?,
    backdropPath: String?,
    releaseDate: String?,
    firstAirDate: String?,
    genreIds: [Int],
    voteAverage: Double,
    mediaType: String?
  ) {
    self.tmdbId = tmdbId
    self.title = title
    self.name = name
    self.overview = overview
    self.posterPath = posterPath
    self.backdropPath = backdropPath
    self.releaseDate = releaseDate
    self.firstAirDate = firstAirDate
    self.genreIds = genreIds
    self.voteAverage = voteAverage
    self.mediaType = mediaType
  }

  var id: String { resolvedMediaType + "-" + String(tmdbId) }
  var displayTitle: String { title ?? name ?? "Untitled" }
  var resolvedMediaType: String {
    if mediaType == "tv" || (name != nil && title == nil) { return "tv" }
    return "movie"
  }
  var yearText: String? {
    let date = releaseDate ?? firstAirDate
    guard let date, date.count >= 4 else { return nil }
    return String(date.prefix(4))
  }
  var posterURL: String? { imageURL(path: posterPath, size: "w500") }
  var backdropURL: String? { imageURL(path: backdropPath, size: "w1280") }
  var starRating: Double { max(0, min(voteAverage / 2, 5)) }

  private func imageURL(path: String?, size: String) -> String? {
    guard let path, !path.isEmpty else { return nil }
    return "https://image.tmdb.org/t/p/" + size + path
  }
}

struct DiscoverExplorePayload: Sendable {
  let popular: [TMDBDiscoverTitle]
  let nowPlaying: [TMDBDiscoverTitle]
  let trending: [TMDBDiscoverTitle]
  let topRated: [TMDBDiscoverTitle]
  let streaming: [TMDBDiscoverTitle]
}

struct DiscoverTelevisionPayload: Sendable {
  let popular: [TMDBDiscoverTitle]
  let onTheAir: [TMDBDiscoverTitle]
  let topRated: [TMDBDiscoverTitle]
}

enum DiscoverTab: String, CaseIterable, Identifiable, Sendable {
  case explore = "Explore"
  case television = "TV Shows"
  case nowPlaying = "Now Playing"

  var id: String { rawValue }
}

struct DiscoverStreamingProvider: Identifiable, Hashable, Sendable {
  let id: Int?
  let label: String

  static let options = [
    DiscoverStreamingProvider(id: nil, label: "All"),
    DiscoverStreamingProvider(id: 8, label: "Netflix"),
    DiscoverStreamingProvider(id: 9, label: "Prime Video"),
    DiscoverStreamingProvider(id: 15, label: "Hulu"),
    DiscoverStreamingProvider(id: 1899, label: "Max"),
    DiscoverStreamingProvider(id: 11, label: "MUBI"),
  ]
}
