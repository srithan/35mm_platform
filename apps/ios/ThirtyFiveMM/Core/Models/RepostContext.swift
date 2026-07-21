import Foundation

struct RepostContext: Codable, Equatable {
  struct User: Codable, Identifiable, Equatable {
    let id: String
    let username: String
    let displayName: String
  }

  let activityId: String
  let repostedAt: Date
  let user: User
  let users: [User]
  let totalCount: Int
  let includesOriginal: Bool

  func merged(with other: RepostContext?, repostCount: Int) -> RepostContext {
    guard let other else {
      return normalized(repostCount: repostCount)
    }

    var mergedUsers: [User] = []
    var seenUserIDs = Set<String>()
    for candidate in users + other.users {
      guard seenUserIDs.insert(candidate.id).inserted else { continue }
      if mergedUsers.count < 2 {
        mergedUsers.append(candidate)
      }
    }

    if mergedUsers.isEmpty {
      mergedUsers = [user]
    }

    return RepostContext(
      activityId: activityId,
      repostedAt: repostedAt,
      user: mergedUsers[0],
      users: mergedUsers,
      totalCount: max(repostCount, totalCount, other.totalCount, mergedUsers.count),
      includesOriginal: includesOriginal || other.includesOriginal
    )
  }

  private func normalized(repostCount: Int) -> RepostContext {
    let distinctUsers = users.reduce(into: [User]()) { result, candidate in
      guard !result.contains(where: { $0.id == candidate.id }), result.count < 2 else { return }
      result.append(candidate)
    }
    let normalizedUsers = distinctUsers.isEmpty ? [user] : distinctUsers

    return RepostContext(
      activityId: activityId,
      repostedAt: repostedAt,
      user: normalizedUsers[0],
      users: normalizedUsers,
      totalCount: max(repostCount, totalCount, normalizedUsers.count),
      includesOriginal: includesOriginal
    )
  }
}
