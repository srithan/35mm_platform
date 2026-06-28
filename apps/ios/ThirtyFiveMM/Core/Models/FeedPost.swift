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
    filmRating = try container.decodeIfPresent(Int.self, forKey: .filmRating)
    media = try container.decodeIfPresent([PostMedia].self, forKey: .media)
    mediaUrls = try container.decodeIfPresent([String].self, forKey: .mediaUrls)
    linkPreview = try container.decodeIfPresent(LinkPreview.self, forKey: .linkPreview)
    film = try container.decodeIfPresent(FilmRef.self, forKey: .film)
    author = try container.decode(PostAuthor.self, forKey: .author)
    poll = try container.decodeIfPresent(Poll.self, forKey: .poll)
  }

  var starRating: Double? {
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
    copy(
      isBookmarked: !isBookmarked,
      bookmarkCount: max(bookmarkCount + (isBookmarked ? -1 : 1), 0)
    )
  }

  private func copy(
    isLiked: Bool? = nil,
    likeCount: Int? = nil,
    isReposted: Bool? = nil,
    repostCount: Int? = nil,
    isBookmarked: Bool? = nil,
    bookmarkCount: Int? = nil
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
      filmRating: filmRating,
      media: media,
      mediaUrls: mediaUrls,
      linkPreview: linkPreview,
      film: film,
      author: author,
      poll: poll
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

  enum CodingKeys: String, CodingKey {
    case id
    case username
    case displayName
    case avatarUrl
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
    username = try container.decodeIfPresent(String.self, forKey: .username) ?? "unknown"
    displayName = try container.decodeIfPresent(String.self, forKey: .displayName)
    avatarUrl = try container.decodeIfPresent(String.self, forKey: .avatarUrl)
  }
}

struct FilmRef: Codable, Identifiable, Equatable {
  let id: String
  let title: String
  let year: Int?
  let posterUrl: String?
  let director: String?

  enum CodingKeys: String, CodingKey {
    case id
    case title
    case year
    case posterUrl
    case director
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
    title = try container.decodeIfPresent(String.self, forKey: .title) ?? "Unknown"
    year = try container.decodeIfPresent(Int.self, forKey: .year)
    posterUrl = try container.decodeIfPresent(String.self, forKey: .posterUrl)
    director = try container.decodeIfPresent(String.self, forKey: .director)
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
  let options: [PollOption]
  let totalVotes: Int
  let userVotedOptionId: String?
  let resultsVisibility: String
  let endsAt: Date?

  enum CodingKeys: String, CodingKey {
    case id
    case options
    case totalVotes
    case userVotedOptionId
    case selectedOptionIds
    case resultsVisibility
    case endsAt
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    options = try container.decode([PollOption].self, forKey: .options)
    totalVotes = try container.decodeIfPresent(Int.self, forKey: .totalVotes) ?? 0
    if let userVotedOptionId = try container.decodeIfPresent(
      String.self,
      forKey: .userVotedOptionId
    ) {
      self.userVotedOptionId = userVotedOptionId
    } else {
      self.userVotedOptionId =
        try container.decodeIfPresent([String].self, forKey: .selectedOptionIds)?.first
    }
    resultsVisibility =
      try container.decodeIfPresent(String.self, forKey: .resultsVisibility) ?? "after_vote"
    endsAt = try container.decodeIfPresent(Date.self, forKey: .endsAt)
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(id, forKey: .id)
    try container.encode(options, forKey: .options)
    try container.encode(totalVotes, forKey: .totalVotes)
    try container.encodeIfPresent(userVotedOptionId, forKey: .userVotedOptionId)
    try container.encode(resultsVisibility, forKey: .resultsVisibility)
    try container.encodeIfPresent(endsAt, forKey: .endsAt)
  }
}

struct PollOption: Codable, Identifiable, Equatable {
  let id: String
  let label: String
  let voteCount: Int

  enum CodingKeys: String, CodingKey {
    case id
    case label
    case voteCount
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
    label = try container.decodeIfPresent(String.self, forKey: .label) ?? ""
    voteCount = try container.decodeIfPresent(Int.self, forKey: .voteCount) ?? 0
  }
}
