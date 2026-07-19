import Foundation

protocol DiscoverServing: Sendable {
  func explore(providerID: Int?) async throws -> DiscoverExplorePayload
  func streaming(providerID: Int?) async throws -> [TMDBDiscoverTitle]
  func television() async throws -> DiscoverTelevisionPayload
  func nowPlaying() async throws -> [TMDBDiscoverTitle]
  func search(query: String) async throws -> [TMDBDiscoverTitle]
}

struct WebDiscoverAPI: DiscoverServing, Sendable {
  private let baseURL: URL
  private let session: URLSession

  init(baseURL: URL = AppConstants.webBaseURLValue, session: URLSession = .shared) {
    self.baseURL = baseURL
    self.session = session
  }

  func explore(providerID: Int?) async throws -> DiscoverExplorePayload {
    async let popular = page("movie/popular", queryItems: [URLQueryItem(name: "page", value: "1")])
    async let nowPlaying = page("movie/now_playing", queryItems: [URLQueryItem(name: "page", value: "1")])
    async let trending = page("trending/all/week")
    async let topRated = page("movie/top_rated", queryItems: [URLQueryItem(name: "page", value: "1")])

    async let streaming = streaming(providerID: providerID)

    return try await DiscoverExplorePayload(
      popular: popular,
      nowPlaying: nowPlaying,
      trending: trending,
      topRated: topRated,
      streaming: streaming
    )
  }

  func streaming(providerID: Int?) async throws -> [TMDBDiscoverTitle] {
    var query = [
      URLQueryItem(name: "page", value: "1"),
      URLQueryItem(name: "sort_by", value: "popularity.desc"),
      URLQueryItem(name: "watch_region", value: "US"),
      URLQueryItem(name: "with_watch_monetization_types", value: "flatrate"),
      URLQueryItem(name: "include_adult", value: "false"),
    ]
    if let providerID {
      query.append(URLQueryItem(name: "with_watch_providers", value: String(providerID)))
    }
    return try await page("discover/movie", queryItems: query)
  }

  func television() async throws -> DiscoverTelevisionPayload {
    async let popular = page("tv/popular", queryItems: [URLQueryItem(name: "page", value: "1")])
    async let onTheAir = page("tv/on_the_air", queryItems: [URLQueryItem(name: "page", value: "1")])
    async let topRated = page("tv/top_rated", queryItems: [URLQueryItem(name: "page", value: "1")])
    return try await DiscoverTelevisionPayload(
      popular: popular,
      onTheAir: onTheAir,
      topRated: topRated
    )
  }

  func nowPlaying() async throws -> [TMDBDiscoverTitle] {
    try await page("movie/now_playing", queryItems: [URLQueryItem(name: "page", value: "1")])
  }

  func search(query: String) async throws -> [TMDBDiscoverTitle] {
    try await page("search/multi", queryItems: [
      URLQueryItem(name: "query", value: query),
      URLQueryItem(name: "include_adult", value: "false"),
    ]).filter { $0.mediaType == "movie" || $0.mediaType == "tv" || $0.title != nil || $0.name != nil }
  }

  private func page(_ path: String, queryItems: [URLQueryItem] = []) async throws -> [TMDBDiscoverTitle] {
    var components = URLComponents(
      url: baseURL.appending(path: "api/tmdb/" + path),
      resolvingAgainstBaseURL: false
    )
    components?.queryItems = queryItems.isEmpty ? nil : queryItems
    guard let url = components?.url else { throw WebDiscoverError.invalidURL }

    var request = URLRequest(url: url)
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.cachePolicy = .useProtocolCachePolicy
    request.timeoutInterval = 20
    let (data, response) = try await session.data(for: request)
    guard let response = response as? HTTPURLResponse else { throw WebDiscoverError.invalidResponse }
    guard (200..<300).contains(response.statusCode) else {
      throw WebDiscoverError.httpStatus(response.statusCode)
    }
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    return try decoder.decode(TMDBDiscoverPage.self, from: data).results
  }
}

private enum WebDiscoverError: LocalizedError {
  case invalidURL
  case invalidResponse
  case httpStatus(Int)

  var errorDescription: String? {
    switch self {
    case .invalidURL: return "Could not build discovery request."
    case .invalidResponse: return "Discovery service returned an invalid response."
    case .httpStatus(let status): return "Discovery service returned HTTP \(status)."
    }
  }
}

@MainActor
protocol CatalogServing: AnyObject {
  func titles(query: String, type: String?, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogTitle>
  func title(id: String) async throws -> CatalogTitleDetail
  func credits(titleId: String, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogCredit>
  func media(titleId: String, type: String?, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogMedia>
  func reviews(filmId: String, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<FeedPost>
  func watchlistStatus(filmId: String) async throws -> WatchlistStatus
  func addToWatchlist(filmId: String) async throws -> WatchlistMutationResponse
  func removeFromWatchlist(filmId: String) async throws -> WatchlistMutationResponse
  func likeReview(postId: String) async throws
  func unlikeReview(postId: String) async throws
}

@MainActor
final class CatalogAPI: CatalogServing {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func titles(query: String, type: String?, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogTitle>
  {
    try await client.request(.getCatalogTitles(query: query, type: type, cursor: cursor, limit: limit))
  }

  func title(id: String) async throws -> CatalogTitleDetail {
    try await client.request(.getCatalogTitle(id))
  }

  func resolveTMDBTitle(id: Int) async throws -> CatalogTitle? {
    let response: PaginatedResponse<CatalogTitle> = try await client.request(
      .getCatalogTitleByTMDB(id)
    )
    return response.items.first
  }

  func credits(titleId: String, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogCredit>
  {
    try await client.request(.getCatalogTitleCredits(titleId, cursor: cursor, limit: limit))
  }

  func media(titleId: String, type: String?, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogMedia>
  {
    try await client.request(.getCatalogTitleMedia(titleId, type: type, cursor: cursor, limit: limit))
  }

  func reviews(filmId: String, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<FeedPost>
  {
    try await client.request(.getFilmReviews(filmId: filmId, cursor: cursor, limit: limit))
  }

  func watchlistStatus(filmId: String) async throws -> WatchlistStatus {
    try await client.request(.getWatchlistStatus(filmId: filmId))
  }

  func addToWatchlist(filmId: String) async throws -> WatchlistMutationResponse {
    try await client.request(.addFilmToWatchlist(filmId: filmId))
  }

  func removeFromWatchlist(filmId: String) async throws -> WatchlistMutationResponse {
    try await client.request(.removeFilmFromWatchlist(filmId: filmId))
  }

  func likeReview(postId: String) async throws {
    let _: CatalogInteractionResponse = try await client.request(.likePost(postId))
  }

  func unlikeReview(postId: String) async throws {
    let _: CatalogInteractionResponse = try await client.request(.unlikePost(postId))
  }
}

private struct CatalogInteractionResponse: Decodable {
  let ok: Bool?
}
