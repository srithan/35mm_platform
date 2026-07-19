import Foundation
import Testing
@testable import ThirtyFiveMM

@MainActor
struct ProfileFeatureTests {
  @Test
  func profileDestinationNormalizesUsername() {
    let destination = ProfileDestination(username: "  Maya.Frames  ")

    #expect(destination.username == "maya.frames")
  }

  @Test
  func profileTabsExposeStableAccessibleLabelsAndSymbols() {
    #expect(ProfileTab.allCases.map(\.title) == ["Posts", "Diary", "Lists", "Stats"])
    #expect(
      ProfileTab.allCases.map(\.systemImage) == [
        "doc.text",
        "film.stack",
        "rectangle.stack",
        "chart.bar.xaxis",
      ]
    )
  }

  @Test
  func profileActionsMatchOwnershipAndMuteState() {
    let ownProfile = makeProfile()
    #expect(ProfileAction.available(for: ownProfile) == [.copyLink])

    let publicProfile = ownProfile.updatingRelationship(followState: .following)
    #expect(ProfileAction.available(for: publicProfile) == [.copyLink, .mute, .block])

    let mutedProfile = publicProfile.updatingRelationship(isMutedByViewer: true)
    #expect(ProfileAction.available(for: mutedProfile) == [.copyLink, .unmute, .block])
  }

  @Test
  func profileScreenAlwaysRendersLoadingFailureOrContent() async {
    let service = ProfileServiceStub()
    service.postPages[ProfileServiceStub.firstPage] = PaginatedResponse(
      items: [],
      nextCursor: nil,
      hasMore: false
    )
    let model = ProfileViewModel(username: "maya.frames", service: service)

    #expect(model.screenPhase == .loading)

    await model.load()
    guard case .failure = model.screenPhase else {
      Issue.record("Missing profile fixture should produce a visible failure state")
      return
    }

    service.profile = makeProfile()
    await model.load()
    guard case .content(let profile) = model.screenPhase else {
      Issue.record("Retry should replace failure with visible profile content")
      return
    }
    #expect(profile.username == "maya.frames")
  }

  @Test
  func decodesPublicProfileContract() throws {
    let data = Data(
      """
      {
        "userId": "user-1",
        "username": "maya.frames",
        "displayName": "Maya Frames",
        "bio": "Writing about images that linger.",
        "avatarUrl": "https://cdn.example/avatar.jpg",
        "avatarUrlLg": "https://cdn.example/avatar-lg.jpg",
        "coverUrl": "https://cdn.example/cover.jpg",
        "location": "Chicago",
        "website": "https://maya.example",
        "dateOfBirth": "1994-04-12",
        "role": "Critic",
        "roleContext": "Frame by Frame",
        "headline": "Critic",
        "headlineContext": "Frame by Frame",
        "filmsLoggedCount": 1248,
        "followerCount": 431,
        "followingCount": 218,
        "followState": "self",
        "isPrivate": false,
        "hasIncomingFollowRequest": false,
        "hasPendingRequestToViewer": false,
        "isMutedByViewer": false,
        "isDeactivated": false,
        "moderationStatus": "active",
        "createdAt": "2024-05-20T12:34:56Z"
      }
      """.utf8
    )

    let profile = try makeDecoder().decode(PublicProfile.self, from: data)

    #expect(profile.userId == "user-1")
    #expect(profile.followState == .selfProfile)
    #expect(profile.displayByline == "Critic · Frame by Frame")
    #expect(profile.isOwnProfile)
  }

  @Test
  func decodesCurrentProfileRelationshipCounts() throws {
    let data = Data(
      """
      {
        "userId": "user-1",
        "username": "maya.frames",
        "displayName": "Maya Frames",
        "avatarUrl": "https://cdn.example/avatar.jpg",
        "avatarUrlLg": "https://cdn.example/avatar-lg.jpg",
        "role": "Critic",
        "roleContext": "Frame by Frame",
        "filmsLoggedCount": 1248,
        "followerCount": 431,
        "followingCount": 218
      }
      """.utf8
    )

    let profile = try makeDecoder().decode(UserProfile.self, from: data)

    #expect(profile.followerCount == 431)
    #expect(profile.followingCount == 218)
  }

  @Test
  func decodesStatsAndListContracts() throws {
    let statsData = Data(
      """
      {
        "username": "maya.frames",
        "filmsLoggedCount": 1248,
        "hoursWatched": 2472,
        "averageRating": 4.1,
        "reviewsWrittenCount": 312,
        "reviewLikeCount": 980,
        "memberSince": "2024-05-20T12:34:56.123Z",
        "favoriteFilms": [{
          "id": "01J35MMFILM00000000000001",
          "tmdbId": 550,
          "imdbId": "tt0137523",
          "title": "Fight Club",
          "year": 1999,
          "posterUrl": "https://cdn.example/fight-club.jpg"
        }],
        "genres": [{"name": "Drama", "count": 42, "percentage": 33.3}],
        "activity": [{"date": "2026-07-17", "count": 2}],
        "recentDiary": [{
          "postId": "post-1",
          "type": "review",
          "createdAt": "2026-07-17T12:00:00Z",
          "rating": 4.5,
          "film": {
            "id": "01J35MMFILM00000000000001",
            "tmdbId": 550,
            "imdbId": "tt0137523",
            "title": "Fight Club",
            "year": 1999,
            "posterUrl": "https://cdn.example/fight-club.jpg"
          }
        }],
        "cachedAt": "2026-07-17T12:01:00Z"
      }
      """.utf8
    )
    let listData = Data(
      """
      {
        "id": "list-1",
        "userId": "user-1",
        "type": "custom",
        "title": "New Hollywood",
        "description": "The decade that changed the frame.",
        "visibility": "public",
        "isRanked": true,
        "tags": ["1970s"],
        "shareSlug": "new-hollywood",
        "likeCount": 82,
        "commentCount": 14,
        "entryCount": 30,
        "isLiked": false,
        "isOwner": true,
        "createdAt": "2026-01-02T12:00:00Z",
        "updatedAt": "2026-07-17T12:00:00Z",
        "owner": {
          "id": "user-1",
          "username": "maya.frames",
          "displayName": "Maya Frames",
          "avatarUrl": null,
          "role": "Critic",
          "roleContext": null,
          "filmsLoggedCount": 1248
        },
        "posterUrls": ["https://cdn.example/one.jpg", null]
      }
      """.utf8
    )

    let stats = try makeDecoder().decode(ProfileStatsSummary.self, from: statsData)
    let list = try makeDecoder().decode(FilmListSummary.self, from: listData)

    #expect(stats.favoriteFilms.first?.id == "01J35MMFILM00000000000001")
    #expect(stats.recentDiary.first?.type == .review)
    #expect(list.entryCount == 30)
    #expect(list.posterUrls.count == 2)
  }

  @Test
  func editDraftValidatesAndEncodesExplicitClears() throws {
    var draft = ProfileEditDraft(profile: makeProfile())
    draft.displayName = "  Maya Updated  "
    draft.website = ""
    draft.dateOfBirth = nil
    draft.role = .cinephile
    draft.roleContext = "Should be removed"

    let request = draft.updateRequest()
    let encoded = try JSONEncoder().encode(request)
    let object = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

    #expect(draft.isValid)
    #expect(object["displayName"] as? String == "Maya Updated")
    #expect(object["website"] is NSNull)
    #expect(object["dateOfBirth"] is NSNull)
    #expect(object["roleContext"] is NSNull)
    #expect(object["headlineContext"] is NSNull)
  }

  @Test
  func editDraftRejectsInvalidWebsiteAndOverlongName() {
    var draft = ProfileEditDraft(profile: makeProfile())
    draft.displayName = String(repeating: "A", count: ProfileEditDraft.displayNameLimit + 1)
    draft.website = "ftp://example.com"

    #expect(draft.errors[.displayName] != nil)
    #expect(draft.errors[.website] != nil)
    #expect(!draft.isValid)
  }

  @Test
  func viewModelLoadsCursorPagesAndDeduplicatesPosts() async throws {
    let service = ProfileServiceStub()
    let first = try makePost(id: "post-1", isLiked: false)
    let second = try makePost(id: "post-2", isLiked: false)
    service.profile = makeProfile()
    service.postPages[ProfileServiceStub.firstPage] = PaginatedResponse(
      items: [first],
      nextCursor: "posts-next",
      hasMore: true
    )
    service.postPages["posts-next"] = PaginatedResponse(
      items: [first, second],
      nextCursor: nil,
      hasMore: false
    )
    let model = ProfileViewModel(username: "Maya.Frames", service: service)

    await model.load()
    await model.loadMorePosts()

    #expect(model.username == "maya.frames")
    #expect(model.posts.map(\.id) == ["post-1", "post-2"])
    #expect(service.postRequests.map(\.cursor) == [nil, "posts-next"])
    #expect(service.postRequests.allSatisfy { $0.limit == 20 })
  }

  @Test
  func viewModelLoadsListsAndStatsOnlyWhenSelected() async {
    let service = ProfileServiceStub()
    service.profile = makeProfile()
    service.postPages[ProfileServiceStub.firstPage] = PaginatedResponse(
      items: [],
      nextCursor: nil,
      hasMore: false
    )
    service.listPages[ProfileServiceStub.firstPage] = PaginatedResponse(
      items: [makeList()],
      nextCursor: nil,
      hasMore: false
    )
    service.stats = makeStats()
    let model = ProfileViewModel(username: "maya.frames", service: service)

    await model.load()
    #expect(service.listRequests.isEmpty)
    #expect(service.statsRequestCount == 0)

    await model.loadTabIfNeeded(.lists)
    await model.loadTabIfNeeded(.lists)
    await model.loadTabIfNeeded(.stats)
    await model.loadTabIfNeeded(.stats)

    #expect(service.listRequests.count == 1)
    #expect(service.statsRequestCount == 1)
    #expect(model.lists.map(\.id) == ["list-1"])
    #expect(model.stats?.filmsLoggedCount == 1248)
  }

  @Test
  func failedOptimisticLikeRollsBackPostState() async throws {
    let service = ProfileServiceStub()
    service.profile = makeProfile()
    service.likeError = ProfileTestError.expected
    service.postPages[ProfileServiceStub.firstPage] = PaginatedResponse(
      items: [try makePost(id: "post-1", isLiked: false)],
      nextCursor: nil,
      hasMore: false
    )
    let model = ProfileViewModel(username: "maya.frames", service: service)
    await model.load()

    await model.toggleLike(postId: "post-1")

    #expect(model.posts.first?.isLiked == false)
    #expect(model.posts.first?.likeCount == 4)
    #expect(model.actionError != nil)
  }

  private func makeDecoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
      let value = try decoder.singleValueContainer().decode(String.self)
      let fractional = ISO8601DateFormatter()
      fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      if let date = fractional.date(from: value) {
        return date
      }
      let standard = ISO8601DateFormatter()
      standard.formatOptions = [.withInternetDateTime]
      guard let date = standard.date(from: value) else {
        throw DecodingError.dataCorruptedError(
          in: try decoder.singleValueContainer(),
          debugDescription: "Invalid ISO 8601 fixture date"
        )
      }
      return date
    }
    return decoder
  }

  private func makePost(id: String, isLiked: Bool) throws -> FeedPost {
    let payload: [String: Any] = [
      "id": id,
      "type": "text",
      "body": "A precise observation.",
      "createdAt": "2026-07-17T12:00:00Z",
      "visibility": "public",
      "likeCount": 4,
      "isLiked": isLiked,
      "author": [
        "id": "user-1",
        "username": "maya.frames",
        "displayName": "Maya Frames",
      ],
    ]
    return try makeDecoder().decode(
      FeedPost.self,
      from: JSONSerialization.data(withJSONObject: payload)
    )
  }

  private func makeProfile() -> PublicProfile {
    PublicProfile(
      userId: "user-1",
      username: "maya.frames",
      displayName: "Maya Frames",
      bio: "Writing about images that linger.",
      avatarUrl: nil,
      avatarUrlLg: nil,
      coverUrl: nil,
      location: "Chicago",
      website: "https://maya.example",
      dateOfBirth: "1994-04-12",
      role: "Critic",
      roleContext: "Frame by Frame",
      headline: "Critic",
      headlineContext: "Frame by Frame",
      filmsLoggedCount: 1248,
      followerCount: 431,
      followingCount: 218,
      followState: .selfProfile,
      isPrivate: false,
      hasIncomingFollowRequest: false,
      hasPendingRequestToViewer: false,
      isMutedByViewer: false,
      isDeactivated: false,
      moderationStatus: "active",
      createdAt: Date(timeIntervalSince1970: 1_716_205_696)
    )
  }

  private func makeList() -> FilmListSummary {
    FilmListSummary(
      id: "list-1",
      userId: "user-1",
      type: .custom,
      title: "New Hollywood",
      description: nil,
      visibility: .public,
      isRanked: true,
      tags: ["1970s"],
      shareSlug: "new-hollywood",
      likeCount: 82,
      commentCount: 14,
      entryCount: 30,
      isLiked: false,
      isOwner: true,
      createdAt: .distantPast,
      updatedAt: .now,
      owner: FilmListSummary.Owner(
        id: "user-1",
        username: "maya.frames",
        displayName: "Maya Frames",
        avatarUrl: nil,
        role: "Critic",
        roleContext: nil,
        filmsLoggedCount: 1248
      ),
      posterUrls: []
    )
  }

  private func makeStats() -> ProfileStatsSummary {
    ProfileStatsSummary(
      username: "maya.frames",
      filmsLoggedCount: 1248,
      hoursWatched: 2472,
      averageRating: 4.1,
      reviewsWrittenCount: 312,
      reviewLikeCount: 980,
      memberSince: .distantPast,
      favoriteFilms: [],
      genres: [],
      activity: [],
      recentDiary: [],
      cachedAt: .now
    )
  }
}

@MainActor
private final class ProfileServiceStub: ProfileServicing {
  struct PageRequest {
    let cursor: String?
    let limit: Int
  }

  static let firstPage = "__first__"

  var profile: PublicProfile?
  var stats: ProfileStatsSummary?
  var postPages: [String: PaginatedResponse<FeedPost>] = [:]
  var listPages: [String: PaginatedResponse<FilmListSummary>] = [:]
  var postRequests: [PageRequest] = []
  var listRequests: [PageRequest] = []
  var statsRequestCount = 0
  var likeError: Error?

  func fetchProfile(username: String) async throws -> PublicProfile {
    guard let profile else { throw ProfileTestError.missingFixture }
    return profile
  }

  func fetchProfilePosts(
    username: String,
    cursor: String?,
    limit: Int
  ) async throws -> PaginatedResponse<FeedPost> {
    postRequests.append(PageRequest(cursor: cursor, limit: limit))
    return postPages[cursor ?? Self.firstPage]
      ?? PaginatedResponse(items: [], nextCursor: nil, hasMore: false)
  }

  func fetchProfileStats(username: String) async throws -> ProfileStatsSummary {
    statsRequestCount += 1
    guard let stats else { throw ProfileTestError.missingFixture }
    return stats
  }

  func fetchProfileLists(
    username: String,
    cursor: String?,
    limit: Int
  ) async throws -> PaginatedResponse<FilmListSummary> {
    listRequests.append(PageRequest(cursor: cursor, limit: limit))
    return listPages[cursor ?? Self.firstPage]
      ?? PaginatedResponse(items: [], nextCursor: nil, hasMore: false)
  }

  func updateProfile(
    _ request: ProfileMutation.UpdateRequest
  ) async throws -> ProfileMutation.PublicProfilePatch {
    guard let profile else { throw ProfileTestError.missingFixture }
    return ProfileMutation.PublicProfilePatch(
      userId: profile.userId,
      username: profile.username,
      displayName: request.displayName ?? profile.displayName,
      bio: request.bio ?? profile.bio,
      avatarUrl: request.shouldClearAvatar ? nil : request.avatarUrl ?? profile.avatarUrl,
      avatarUrlLg: request.shouldClearAvatar ? nil : profile.avatarUrlLg,
      coverUrl: request.shouldClearCover ? nil : request.coverUrl ?? profile.coverUrl,
      location: request.location ?? profile.location,
      website: request.shouldClearWebsite ? nil : request.website ?? profile.website,
      dateOfBirth: request.shouldClearDateOfBirth ? nil : request.dateOfBirth ?? profile.dateOfBirth,
      role: request.role ?? profile.role,
      roleContext: request.shouldClearRoleContext ? nil : request.roleContext ?? profile.roleContext,
      headline: request.headline ?? profile.headline,
      headlineContext: request.shouldClearHeadlineContext
        ? nil
        : request.headlineContext ?? profile.headlineContext
    )
  }

  func uploadProfileMedia(
    data: Data,
    contentType: String,
    kind: ProfileMutation.MediaKind,
    progress: @escaping @MainActor (Double) -> Void
  ) async throws -> String {
    progress(1)
    return "https://cdn.example/profile.jpg"
  }

  func follow(userId: String) async throws -> ProfileMutation.FollowResponse {
    ProfileMutation.FollowResponse(ok: true, isFollowing: true, status: "accepted")
  }

  func unfollow(userId: String) async throws {}

  func setMuted(userId: String, muted: Bool) async throws {}

  func block(userId: String) async throws {}

  func setPostLike(postId: String, liked: Bool) async throws {
    if let likeError { throw likeError }
  }

  func setPostRepost(postId: String, reposted: Bool) async throws {}

  func setPostBookmark(postId: String, bookmarked: Bool) async throws {}

  func votePoll(postId: String, optionIds: [String]) async throws {}
}

private enum ProfileTestError: Error {
  case expected
  case missingFixture
}
