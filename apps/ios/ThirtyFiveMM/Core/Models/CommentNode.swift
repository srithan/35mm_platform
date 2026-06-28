import Foundation

struct CommentNode: Identifiable {
  let id: String
  let comment: Comment
  var replies: [CommentNode]

  init(comment: Comment, replies: [CommentNode] = []) {
    id = comment.id
    self.comment = comment
    self.replies = replies
  }
}

struct CommentTree {
  static func build(from comments: [Comment]) -> [CommentNode] {
    let commentsById = Dictionary(uniqueKeysWithValues: comments.map { ($0.id, $0) })
    var replyBuckets: [String: [Comment]] = [:]
    var topLevel: [Comment] = []

    for comment in comments {
      guard let parentId = comment.parentId else {
        topLevel.append(comment)
        continue
      }

      guard commentsById[parentId] != nil else {
        topLevel.append(comment)
        continue
      }

      let rootId = topLevelParentId(
        for: parentId,
        commentsById: commentsById
      )
      replyBuckets[rootId, default: []].append(comment)
    }

    return topLevel.map { comment in
      CommentNode(
        comment: comment,
        replies: (replyBuckets[comment.id] ?? []).map { CommentNode(comment: $0) }
      )
    }
  }

  private static func topLevelParentId(
    for parentId: String,
    commentsById: [String: Comment]
  ) -> String {
    var currentId = parentId
    var visited = Set<String>()

    while let current = commentsById[currentId],
      let nextParentId = current.parentId,
      commentsById[nextParentId] != nil,
      visited.insert(currentId).inserted
    {
      currentId = nextParentId
    }

    return currentId
  }
}
