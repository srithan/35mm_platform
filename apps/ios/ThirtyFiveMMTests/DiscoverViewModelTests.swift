import XCTest
@testable import ThirtyFiveMM

@MainActor
final class DiscoverViewModelTests: XCTestCase {
  func testTMDBMultiSearchPersonResultDecodesWithoutMovieFields() throws {
    let data = Data(#"{"id":42,"name":"A Director","media_type":"person"}"#.utf8)
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase

    let result = try decoder.decode(TMDBDiscoverTitle.self, from: data)

    XCTAssertEqual(result.tmdbId, 42)
    XCTAssertEqual(result.genreIds, [])
    XCTAssertEqual(result.voteAverage, 0)
    XCTAssertEqual(result.mediaType, "person")
  }

  func testSearchUsesTrimmedQueryAndDeduplicatesResults() async {
    let duplicate = makeDiscoverTitle(id: 1, title: "Heat")
    let service = DiscoverServiceSpy()
    service.searchResponse = [duplicate, duplicate, makeDiscoverTitle(id: 2, title: "Thief")]
    let viewModel = DiscoverViewModel(service: service)
    viewModel.searchText = "  noir  "

    await viewModel.loadCurrent()

    XCTAssertEqual(service.searchQueries, ["noir"])
    XCTAssertEqual(viewModel.searchResults.map(\.tmdbId), [1, 2])
  }

  func testSelectingTelevisionLoadsItsThreeWebEquivalentShelvesOnce() async {
    let service = DiscoverServiceSpy()
    service.televisionResponse = DiscoverTelevisionPayload(
      popular: [makeDiscoverTitle(id: 1, title: "Popular")],
      onTheAir: [makeDiscoverTitle(id: 2, title: "On Air")],
      topRated: [makeDiscoverTitle(id: 3, title: "Top Rated")]
    )
    let viewModel = DiscoverViewModel(service: service)

    await viewModel.selectTab(.television)
    await viewModel.loadCurrent()

    XCTAssertEqual(service.televisionRequests, 1)
    XCTAssertEqual(viewModel.television?.popular.first?.displayTitle, "Popular")
  }

  func testChangingStreamingProviderOnlyReloadsStreamingShelf() async {
    let service = DiscoverServiceSpy()
    service.exploreResponse = DiscoverExplorePayload(
      popular: [makeDiscoverTitle(id: 1, title: "Popular")],
      nowPlaying: [],
      trending: [],
      topRated: [],
      streaming: [makeDiscoverTitle(id: 2, title: "All Services")]
    )
    service.streamingResponse = [makeDiscoverTitle(id: 3, title: "MUBI")]
    let viewModel = DiscoverViewModel(service: service)

    await viewModel.loadCurrent()
    await viewModel.selectStreamingProvider(11)

    XCTAssertEqual(service.exploreProviderIDs, [nil])
    XCTAssertEqual(service.streamingProviderIDs, [11])
    XCTAssertEqual(viewModel.explore?.popular.first?.displayTitle, "Popular")
    XCTAssertEqual(viewModel.explore?.streaming.first?.displayTitle, "MUBI")
  }

  private func makeDiscoverTitle(id: Int, title: String) -> TMDBDiscoverTitle {
    TMDBDiscoverTitle(
      tmdbId: id,
      title: title,
      name: nil,
      overview: nil,
      posterPath: nil,
      backdropPath: nil,
      releaseDate: "2026-01-01",
      firstAirDate: nil,
      genreIds: [],
      voteAverage: 8,
      mediaType: "movie"
    )
  }
}

private final class DiscoverServiceSpy: DiscoverServing, @unchecked Sendable {
  var exploreResponse = DiscoverExplorePayload(
    popular: [], nowPlaying: [], trending: [], topRated: [], streaming: []
  )
  var streamingResponse: [TMDBDiscoverTitle] = []
  var televisionResponse = DiscoverTelevisionPayload(popular: [], onTheAir: [], topRated: [])
  var nowPlayingResponse: [TMDBDiscoverTitle] = []
  var searchResponse: [TMDBDiscoverTitle] = []
  private(set) var exploreProviderIDs: [Int?] = []
  private(set) var streamingProviderIDs: [Int?] = []
  private(set) var televisionRequests = 0
  private(set) var searchQueries: [String] = []

  func explore(providerID: Int?) async throws -> DiscoverExplorePayload {
    exploreProviderIDs.append(providerID)
    return exploreResponse
  }

  func streaming(providerID: Int?) async throws -> [TMDBDiscoverTitle] {
    streamingProviderIDs.append(providerID)
    return streamingResponse
  }

  func television() async throws -> DiscoverTelevisionPayload {
    televisionRequests += 1
    return televisionResponse
  }

  func nowPlaying() async throws -> [TMDBDiscoverTitle] { nowPlayingResponse }

  func search(query: String) async throws -> [TMDBDiscoverTitle] {
    searchQueries.append(query)
    return searchResponse
  }
}

@MainActor
final class TitleDetailViewModelTests: XCTestCase {
  func testReviewsUseCanonicalFilmBridgeAndCursorWithoutDuplicates() async throws {
    let service = CatalogServiceSpy()
    service.detail = makeDetail(legacyFilmID: "01J11111111111111111111111")
    service.reviewPages = [
      PaginatedResponse(
        items: [try makeReview(id: "review-1")],
        nextCursor: "reviews-cursor",
        hasMore: true
      ),
      PaginatedResponse(
        items: [try makeReview(id: "review-1"), try makeReview(id: "review-2")],
        nextCursor: nil,
        hasMore: false
      ),
    ]
    let viewModel = TitleDetailViewModel(titleID: "catalog-title", service: service)

    await viewModel.load()
    await viewModel.loadReviewsIfNeeded()
    await viewModel.loadMoreReviews()

    XCTAssertEqual(service.reviewRequests.map(\.filmID), [
      "01J11111111111111111111111", "01J11111111111111111111111",
    ])
    XCTAssertEqual(service.reviewRequests.map(\.cursor), [nil, "reviews-cursor"])
    XCTAssertEqual(viewModel.reviews.map(\.id), ["review-1", "review-2"])
    XCTAssertFalse(viewModel.hasMoreReviews)
  }

  func testUnbridgedCatalogTitleDoesNotRequestSocialData() async {
    let service = CatalogServiceSpy()
    service.detail = makeDetail(legacyFilmID: nil)
    let viewModel = TitleDetailViewModel(titleID: "catalog-title", service: service)

    await viewModel.load()
    await viewModel.loadReviewsIfNeeded()

    XCTAssertTrue(service.reviewRequests.isEmpty)
    XCTAssertTrue(service.watchlistRequests.isEmpty)
    XCTAssertTrue(viewModel.reviews.isEmpty)
    XCTAssertFalse(viewModel.hasMoreReviews)
  }

  private func makeDetail(legacyFilmID: String?) -> CatalogTitleDetail {
    CatalogTitleDetail(
      id: "catalog-title",
      type: "movie",
      primaryTitle: "Catalog Title",
      originalTitle: nil,
      slug: "catalog-title",
      startYear: 2026,
      endYear: nil,
      releaseDate: nil,
      runtimeMinutes: 100,
      primaryLanguage: "en",
      primaryCountry: "US",
      isVerified: true,
      primaryMedia: nil,
      legacyFilmId: legacyFilmID,
      synopsis: nil,
      originCountries: ["US"],
      spokenLanguages: ["en"],
      seasonNumber: nil,
      episodeNumber: nil,
      externalIds: []
    )
  }

  private func makeReview(id: String) throws -> FeedPost {
    let data = Data(
      """
      {
        "id": "\(id)",
        "type": "review",
        "headline": null,
        "body": "Review body",
        "createdAt": "2026-07-17T12:00:00Z",
        "visibility": "public",
        "author": { "id": "user-1", "username": "critic" }
      }
      """.utf8
    )
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return try decoder.decode(FeedPost.self, from: data)
  }
}

@MainActor
private final class CatalogServiceSpy: CatalogServing {
  struct TitleRequest {
    let query: String
    let type: String?
    let cursor: String?
    let limit: Int
  }

  struct ReviewRequest {
    let filmID: String
    let cursor: String?
  }

  var titlePages: [PaginatedResponse<CatalogTitle>] = []
  var detail: CatalogTitleDetail?
  var reviewPages: [PaginatedResponse<FeedPost>] = []
  private(set) var titleRequests: [TitleRequest] = []
  private(set) var reviewRequests: [ReviewRequest] = []
  private(set) var watchlistRequests: [String] = []

  func titles(query: String, type: String?, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogTitle>
  {
    titleRequests.append(TitleRequest(query: query, type: type, cursor: cursor, limit: limit))
    return titlePages.removeFirst()
  }

  func title(id: String) async throws -> CatalogTitleDetail {
    guard let detail else { throw CatalogSpyError.unused }
    return detail
  }
  func credits(titleId: String, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogCredit>
  { PaginatedResponse(items: [], nextCursor: nil, hasMore: false) }
  func media(titleId: String, type: String?, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<CatalogMedia>
  { PaginatedResponse(items: [], nextCursor: nil, hasMore: false) }
  func reviews(filmId: String, cursor: String?, limit: Int) async throws
    -> PaginatedResponse<FeedPost>
  {
    reviewRequests.append(ReviewRequest(filmID: filmId, cursor: cursor))
    return reviewPages.removeFirst()
  }
  func watchlistStatus(filmId: String) async throws -> WatchlistStatus {
    watchlistRequests.append(filmId)
    return WatchlistStatus(filmId: filmId, isInWatchlist: false, watchlistId: nil, entryId: nil)
  }
  func addToWatchlist(filmId: String) async throws -> WatchlistMutationResponse {
    throw CatalogSpyError.unused
  }
  func removeFromWatchlist(filmId: String) async throws -> WatchlistMutationResponse {
    throw CatalogSpyError.unused
  }
  func likeReview(postId: String) async throws { throw CatalogSpyError.unused }
  func unlikeReview(postId: String) async throws { throw CatalogSpyError.unused }
}

private enum CatalogSpyError: Error {
  case unused
}
