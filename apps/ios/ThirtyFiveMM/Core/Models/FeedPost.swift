import Foundation

struct FeedPost: Codable, Identifiable, Hashable {
  let id: String
  let type: PostType
  let headline: String?
  let body: String?
  let createdAt: Date
  let editedAt: Date?
  let isRepost: Bool
  let repostOfId: String?
  let visibility: PostVisibility
  let likeCount: Int
  let commentCount: Int
  let repostCount: Int
  let bookmarkCount: Int
  let isLiked: Bool
  let isReposted: Bool
  let isBookmarked: Bool
  let bookmarkFolderId: String?
  let filmRating: Int?
  let media: [PostMedia]?
  let mediaUrls: [String]?
  let linkPreview: LinkPreview?
  let film: FilmRef?
  let author: PostAuthor
  let poll: Poll?

  enum CodingKeys: String, CodingKey {
    case id
    case type
    case headline
    case body
    case createdAt
    case editedAt
    case isRepost
    case repostOfId
    case visibility
    case likeCount
    case commentCount
    case repostCount
    case bookmarkCount
    case isLiked
    case isReposted
    case isBookmarked
    case bookmarkFolderId
    case filmRating
    case media
    case mediaUrls
    case linkPreview
    case film
    case author
    case poll
  }

  init(
    id: String,
    type: PostType,
    headline: String?,
    body: String?,
    createdAt: Date,
    editedAt: Date?,
    isRepost: Bool,
    repostOfId: String?,
    visibility: PostVisibility,
    likeCount: Int,
    commentCount: Int,
    repostCount: Int,
    bookmarkCount: Int,
    isLiked: Bool,
    isReposted: Bool,
    isBookmarked: Bool,
    bookmarkFolderId: String? = nil,
    filmRating: Int?,
    media: [PostMedia]?,
    mediaUrls: [String]?,
    linkPreview: LinkPreview?,
    film: FilmRef?,
    author: PostAuthor,
    poll: Poll?
  ) {
    self.id = id
    self.type = type
    self.headline = headline
    self.body = body
    self.createdAt = createdAt
    self.editedAt = editedAt
    self.isRepost = isRepost
    self.repostOfId = repostOfId
    self.visibility = visibility
    self.likeCount = likeCount
    self.commentCount = commentCount
    self.repostCount = repostCount
    self.bookmarkCount = bookmarkCount
    self.isLiked = isLiked
    self.isReposted = isReposted
    self.isBookmarked = isBookmarked
    self.bookmarkFolderId = bookmarkFolderId
    self.filmRating = filmRating
    self.media = media
    self.mediaUrls = mediaUrls
    self.linkPreview = linkPreview
    self.film = film
    self.author = author
    self.poll = poll
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)

    id = try container.decode(String.self, forKey: .id)
    type = try container.decode(PostType.self, forKey: .type)
    headline = try container.decodeIfPresent(String.self, forKey: .headline)
    body = try container.decodeIfPresent(String.self, forKey: .body)
    createdAt = try container.decode(Date.self, forKey: .createdAt)
    editedAt = try container.decodeIfPresent(Date.self, forKey: .editedAt)
    isRepost = try container.decodeIfPresent(Bool.self, forKey: .isRepost) ?? false
    repostOfId = try container.decodeIfPresent(String.self, forKey: .repostOfId)
    visibility = try container.decode(PostVisibility.self, forKey: .visibility)
    likeCount = try container.decodeIfPresent(Int.self, forKey: .likeCount) ?? 0
    commentCount = try container.decodeIfPresent(Int.self, forKey: .commentCount) ?? 0
    repostCount = try container.decodeIfPresent(Int.self, forKey: .repostCount) ?? 0
    bookmarkCount = try container.decodeIfPresent(Int.self, forKey: .bookmarkCount) ?? 0
    isLiked = try container.decodeIfPresent(Bool.self, forKey: .isLiked) ?? false
    isReposted = try container.decodeIfPresent(Bool.self, forKey: .isReposted) ?? false
    isBookmarked = try container.decodeIfPresent(Bool.self, forKey: .isBookmarked) ?? false
    bookmarkFolderId = try container.decodeIfPresent(String.self, forKey: .bookmarkFolderId)
    filmRating = try container.decodeIfPresent(Int.self, forKey: .filmRating)
    media = try container.decodeIfPresent([PostMedia].self, forKey: .media)
    mediaUrls = try container.decodeIfPresent([String].self, forKey: .mediaUrls)
    linkPreview = try container.decodeIfPresent(LinkPreview.self, forKey: .linkPreview)
    film = try container.decodeIfPresent(FilmRef.self, forKey: .film)
    author = try container.decode(PostAuthor.self, forKey: .author)
    poll = try container.decodeIfPresent(Poll.self, forKey: .poll)
  }

  var starRating: Double? {
    if let rating = film?.rating {
      return rating
    }

    guard let filmRating else { return nil }
    return Double(filmRating) / 2.0
  }

  func toggledLike() -> FeedPost {
    copy(isLiked: !isLiked, likeCount: max(likeCount + (isLiked ? -1 : 1), 0))
  }

  func toggledRepost() -> FeedPost {
    copy(isReposted: !isReposted, repostCount: max(repostCount + (isReposted ? -1 : 1), 0))
  }

  func toggledBookmark() -> FeedPost {
    movedBookmark(
      to: isBookmarked ? nil : bookmarkFolderId,
      isBookmarked: !isBookmarked,
      bookmarkCount: max(bookmarkCount + (isBookmarked ? -1 : 1), 0)
    )
  }

  func movedBookmark(to folderId: String?) -> FeedPost {
    movedBookmark(to: folderId, isBookmarked: isBookmarked, bookmarkCount: bookmarkCount)
  }

  private func movedBookmark(to folderId: String?, isBookmarked: Bool, bookmarkCount: Int) -> FeedPost {
    FeedPost(
      id: id,
      type: type,
      headline: headline,
      body: body,
      createdAt: createdAt,
      editedAt: editedAt,
      isRepost: isRepost,
      repostOfId: repostOfId,
      visibility: visibility,
      likeCount: likeCount,
      commentCount: commentCount,
      repostCount: repostCount,
      bookmarkCount: bookmarkCount,
      isLiked: isLiked,
      isReposted: isReposted,
      isBookmarked: isBookmarked,
      bookmarkFolderId: folderId,
      filmRating: filmRating,
      media: media,
      mediaUrls: mediaUrls,
      linkPreview: linkPreview,
      film: film,
      author: author,
      poll: poll
    )
  }

  func votedPoll(optionIds: [String]) -> FeedPost? {
    guard let poll, let updatedPoll = poll.applyingOptimisticVote(optionIds: optionIds) else {
      return nil
    }

    return copy(poll: updatedPoll)
  }

  private func copy(
    isLiked: Bool? = nil,
    likeCount: Int? = nil,
    isReposted: Bool? = nil,
    repostCount: Int? = nil,
    isBookmarked: Bool? = nil,
    bookmarkCount: Int? = nil,
    poll: Poll? = nil
  ) -> FeedPost {
    FeedPost(
      id: id,
      type: type,
      headline: headline,
      body: body,
      createdAt: createdAt,
      editedAt: editedAt,
      isRepost: isRepost,
      repostOfId: repostOfId,
      visibility: visibility,
      likeCount: likeCount ?? self.likeCount,
      commentCount: commentCount,
      repostCount: repostCount ?? self.repostCount,
      bookmarkCount: bookmarkCount ?? self.bookmarkCount,
      isLiked: isLiked ?? self.isLiked,
      isReposted: isReposted ?? self.isReposted,
      isBookmarked: isBookmarked ?? self.isBookmarked,
      bookmarkFolderId: bookmarkFolderId,
      filmRating: filmRating,
      media: media,
      mediaUrls: mediaUrls,
      linkPreview: linkPreview,
      film: film,
      author: author,
      poll: poll ?? self.poll
    )
  }
}

extension FeedPost {
  static func == (lhs: FeedPost, rhs: FeedPost) -> Bool {
    lhs.id == rhs.id
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }
}

enum PostType: String, Codable {
  case text
  case discussion
  case log
  case review
  case image
}

enum PostVisibility: String, Codable {
  case `public`
  case followersOnly = "followers_only"
  case `private`
}

struct PostAuthor: Codable, Identifiable, Equatable {
  let id: String
  let username: String
  let displayName: String?
  let avatarUrl: String?
  let role: String?
  let roleContext: String?
  let filmsLoggedCount: Int?

  enum CodingKeys: String, CodingKey {
    case id
    case username
    case displayName
    case avatarUrl
    case role
    case roleContext
    case filmsLoggedCount
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
    username = try container.decodeIfPresent(String.self, forKey: .username) ?? "unknown"
    displayName = try container.decodeIfPresent(String.self, forKey: .displayName)
    avatarUrl = try container.decodeIfPresent(String.self, forKey: .avatarUrl)
    role = try container.decodeIfPresent(String.self, forKey: .role)
    roleContext = try container.decodeIfPresent(String.self, forKey: .roleContext)
    filmsLoggedCount = try container.decodeIfPresent(Int.self, forKey: .filmsLoggedCount)
  }
}

struct FilmRef: Codable, Identifiable, Equatable {
  let id: String
  let title: String
  let year: Int?
  let posterUrl: String?
  let director: String?
  let genres: [String]
  let rating: Double?

  enum CodingKeys: String, CodingKey {
    case id
    case title
    case year
    case posterUrl
    case director
    case genres
    case rating
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
    title = try container.decodeIfPresent(String.self, forKey: .title) ?? "Unknown"
    year = try container.decodeIfPresent(Int.self, forKey: .year)
    posterUrl = try container.decodeIfPresent(String.self, forKey: .posterUrl)
    director = try container.decodeIfPresent(String.self, forKey: .director)
    genres = try container.decodeIfPresent([String].self, forKey: .genres) ?? []
    rating = try container.decodeIfPresent(Double.self, forKey: .rating)
  }
}

struct LinkPreview: Codable, Equatable {
  let url: String
  let title: String?
  let description: String?
  let imageUrl: String?

  enum CodingKeys: String, CodingKey {
    case url
    case title
    case description
    case imageUrl
    case image
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    url = try container.decodeIfPresent(String.self, forKey: .url) ?? ""
    title = try container.decodeIfPresent(String.self, forKey: .title)
    description = try container.decodeIfPresent(String.self, forKey: .description)
    imageUrl =
      try container.decodeIfPresent(String.self, forKey: .imageUrl)
      ?? container.decodeIfPresent(String.self, forKey: .image)
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(url, forKey: .url)
    try container.encodeIfPresent(title, forKey: .title)
    try container.encodeIfPresent(description, forKey: .description)
    try container.encodeIfPresent(imageUrl, forKey: .imageUrl)
  }
}

struct PostMedia: Codable, Equatable {
  let type: String?
  let url: String
  let width: Int?
  let height: Int?

  enum CodingKeys: String, CodingKey {
    case type
    case url
    case width
    case height
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    type = try container.decodeIfPresent(String.self, forKey: .type)
    url = try container.decodeIfPresent(String.self, forKey: .url) ?? ""
    width = try container.decodeIfPresent(Int.self, forKey: .width)
    height = try container.decodeIfPresent(Int.self, forKey: .height)
  }
}

struct Poll: Codable, Identifiable, Equatable {
  let id: String
  let type: PollType
  let options: [PollOption]
  let totalVotes: Int
  let hasVoted: Bool
  let isEnded: Bool
  let resultsVisible: Bool
  let selectedOptionIds: [String]
  let resultsVisibility: PollResultsVisibility
  let endsAt: Date?

  enum CodingKeys: String, CodingKey {
    case id
    case type
    case options
    case totalVotes
    case hasVoted
    case isEnded
    case resultsVisible
    case userVotedOptionId
    case selectedOptionIds
    case resultsVisibility
    case endsAt
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    type = try container.decodeIfPresent(PollType.self, forKey: .type) ?? .ranking
    options = try container.decode([PollOption].self, forKey: .options)
    totalVotes = try container.decodeIfPresent(Int.self, forKey: .totalVotes) ?? 0
    let legacySelectedOptionId = try container.decodeIfPresent(String.self, forKey: .userVotedOptionId)
    let selectedOptionIds =
      try container.decodeIfPresent([String].self, forKey: .selectedOptionIds)
      ?? legacySelectedOptionId.map { [$0] }
      ?? []

    self.selectedOptionIds = selectedOptionIds
    hasVoted = try container.decodeIfPresent(Bool.self, forKey: .hasVoted) ?? !selectedOptionIds.isEmpty
    endsAt = try container.decodeIfPresent(Date.self, forKey: .endsAt)

    let computedEnded = endsAt.map { $0 <= Date() } ?? false
    isEnded = try container.decodeIfPresent(Bool.self, forKey: .isEnded) ?? computedEnded
    resultsVisibility =
      try container.decodeIfPresent(PollResultsVisibility.self, forKey: .resultsVisibility)
      ?? .afterVote

    if let resultsVisible = try container.decodeIfPresent(Bool.self, forKey: .resultsVisible) {
      self.resultsVisible = resultsVisible
    } else {
      self.resultsVisible = hasVoted || isEnded
    }
  }

  init(
    id: String,
    type: PollType,
    options: [PollOption],
    totalVotes: Int,
    hasVoted: Bool,
    isEnded: Bool,
    resultsVisible: Bool,
    selectedOptionIds: [String],
    resultsVisibility: PollResultsVisibility,
    endsAt: Date?
  ) {
    self.id = id
    self.type = type
    self.options = options
    self.totalVotes = totalVotes
    self.hasVoted = hasVoted
    self.isEnded = isEnded
    self.resultsVisible = resultsVisible
    self.selectedOptionIds = selectedOptionIds
    self.resultsVisibility = resultsVisibility
    self.endsAt = endsAt
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(id, forKey: .id)
    try container.encode(type, forKey: .type)
    try container.encode(options, forKey: .options)
    try container.encode(totalVotes, forKey: .totalVotes)
    try container.encode(hasVoted, forKey: .hasVoted)
    try container.encode(isEnded, forKey: .isEnded)
    try container.encode(resultsVisible, forKey: .resultsVisible)
    try container.encode(selectedOptionIds, forKey: .selectedOptionIds)
    try container.encode(resultsVisibility, forKey: .resultsVisibility)
    try container.encodeIfPresent(endsAt, forKey: .endsAt)
  }

  func applyingOptimisticVote(optionIds: [String]) -> Poll? {
    let uniqueOptionIds = optionIds.reduce(into: [String]()) { result, optionId in
      guard !optionId.isEmpty, !result.contains(optionId) else { return }
      result.append(optionId)
    }
    guard !hasVoted, !isEnded, !uniqueOptionIds.isEmpty else { return nil }
    if type == .image && uniqueOptionIds.count != 1 { return nil }

    let newTotalVotes = totalVotes + 1
    let votedOptions = options.map { option in
      guard let rankIndex = uniqueOptionIds.firstIndex(of: option.id) else {
        return option.withVoteCount(option.voteCount ?? 0)
      }

      let increment = type == .image ? 1 : uniqueOptionIds.count - rankIndex
      return option.withVoteCount((option.voteCount ?? 0) + increment)
    }

    let scoreTotal = votedOptions.reduce(0) { $0 + ($1.voteCount ?? 0) }
    let denominator = type == .ranking ? scoreTotal : newTotalVotes

    return Poll(
      id: id,
      type: type,
      options: votedOptions.map { $0.withPercent(Self.percent(voteCount: $0.voteCount, denominator: denominator)) },
      totalVotes: newTotalVotes,
      hasVoted: true,
      isEnded: isEnded,
      resultsVisible: true,
      selectedOptionIds: uniqueOptionIds,
      resultsVisibility: resultsVisibility,
      endsAt: endsAt
    )
  }

  private static func percent(voteCount: Int?, denominator: Int) -> Double? {
    guard denominator > 0 else { return nil }
    return (Double(voteCount ?? 0) / Double(denominator) * 1000).rounded() / 10
  }
}

struct PollOption: Codable, Identifiable, Equatable {
  let id: String
  let label: String?
  let imageUrl: String?
  let position: Int
  let voteCount: Int?
  let percent: Double?

  enum CodingKeys: String, CodingKey {
    case id
    case label
    case imageUrl
    case position
    case voteCount
    case percent
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
    label = try container.decodeIfPresent(String.self, forKey: .label)
    imageUrl = try container.decodeIfPresent(String.self, forKey: .imageUrl)
    position = try container.decodeIfPresent(Int.self, forKey: .position) ?? 0
    voteCount = try container.decodeIfPresent(Int.self, forKey: .voteCount)
    percent = try container.decodeIfPresent(Double.self, forKey: .percent)
  }

  init(
    id: String,
    label: String?,
    imageUrl: String?,
    position: Int,
    voteCount: Int?,
    percent: Double?
  ) {
    self.id = id
    self.label = label
    self.imageUrl = imageUrl
    self.position = position
    self.voteCount = voteCount
    self.percent = percent
  }

  var displayLabel: String {
    let trimmed = label?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? "Option \(position + 1)" : trimmed
  }

  func withVoteCount(_ voteCount: Int) -> PollOption {
    PollOption(
      id: id,
      label: label,
      imageUrl: imageUrl,
      position: position,
      voteCount: voteCount,
      percent: percent
    )
  }

  func withPercent(_ percent: Double?) -> PollOption {
    PollOption(
      id: id,
      label: label,
      imageUrl: imageUrl,
      position: position,
      voteCount: voteCount,
      percent: percent
    )
  }
}

enum PollType: String, Codable {
  case ranking
  case image
}

enum PollResultsVisibility: String, Codable {
  case afterVote = "after_vote"
  case afterEnd = "after_end"
}
