import Foundation

struct Comment: Codable, Identifiable {
  let id: String
  let postId: String
  let parentId: String?
  let body: String?
  let createdAt: Date
  let editedAt: Date?
  let likeCount: Int
  let isLiked: Bool
  let isDeleted: Bool
  let author: PostAuthor

  enum CodingKeys: String, CodingKey {
    case id
    case postId
    case parentId
    case body
    case createdAt
    case editedAt
    case likeCount
    case isLiked
    case isDeleted
    case author
  }

  init(
    id: String,
    postId: String,
    parentId: String?,
    body: String?,
    createdAt: Date,
    editedAt: Date?,
    likeCount: Int,
    isLiked: Bool,
    isDeleted: Bool,
    author: PostAuthor
  ) {
    self.id = id
    self.postId = postId
    self.parentId = parentId
    self.body = body
    self.createdAt = createdAt
    self.editedAt = editedAt
    self.likeCount = likeCount
    self.isLiked = isLiked
    self.isDeleted = isDeleted
    self.author = author
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    postId = try container.decode(String.self, forKey: .postId)
    parentId = try container.decodeIfPresent(String.self, forKey: .parentId)
    body = try container.decodeIfPresent(String.self, forKey: .body)
    createdAt = try container.decode(Date.self, forKey: .createdAt)
    editedAt = try container.decodeIfPresent(Date.self, forKey: .editedAt)
    likeCount = try container.decodeIfPresent(Int.self, forKey: .likeCount) ?? 0
    isLiked = try container.decodeIfPresent(Bool.self, forKey: .isLiked) ?? false
    isDeleted = try container.decodeIfPresent(Bool.self, forKey: .isDeleted) ?? false
    author = try container.decode(PostAuthor.self, forKey: .author)
  }

  func toggledLike() -> Comment {
    Comment(
      id: id,
      postId: postId,
      parentId: parentId,
      body: body,
      createdAt: createdAt,
      editedAt: editedAt,
      likeCount: max(likeCount + (isLiked ? -1 : 1), 0),
      isLiked: !isLiked,
      isDeleted: isDeleted,
      author: author
    )
  }

  func withLikeCount(_ likeCount: Int) -> Comment {
    Comment(
      id: id,
      postId: postId,
      parentId: parentId,
      body: body,
      createdAt: createdAt,
      editedAt: editedAt,
      likeCount: max(likeCount, 0),
      isLiked: isLiked,
      isDeleted: isDeleted,
      author: author
    )
  }
}
