import Foundation

extension NotificationItem {
  var actorDisplaySummary: String {
    var names: [String] = []
    var seen = Set<String>()

    for profile in actorProfiles ?? [] {
      guard seen.insert(profile.userId).inserted else { continue }
      let name = profile.displayName?.trimmingCharacters(in: .whitespacesAndNewlines)
      let label = name?.isEmpty == false ? name : profile.username
      if let label, !label.isEmpty {
        names.append(label)
      }
    }

    if names.isEmpty, let actor {
      let displayName = actor.displayName.trimmingCharacters(in: .whitespacesAndNewlines)
      names.append(displayName.isEmpty ? actor.username : displayName)
    }

    guard let first = names.first else { return "Someone" }
    let total = max(bundleCount, names.count, 1)
    guard total > 1 else { return first }

    if total == 2, names.count > 1 {
      return "\(first) and \(names[1])"
    }

    if names.count > 1 {
      return "\(first), \(names[1]) and \(max(total - 2, 1)) others"
    }

    return "\(first) and \(total - 1) \(total == 2 ? "other" : "others")"
  }

  var actionSummary: String {
    switch type {
    case .follow:
      "Started following you"
    case .followRequest:
      "Requested to follow you"
    case .followRequestApproved:
      "Approved your follow request"
    case .like:
      entity?.type == .comment ? "Liked your comment" : "Liked your post"
    case .comment:
      "Commented on your post"
    case .reply:
      "Replied to your comment"
    case .mention:
      entity?.type == .comment ? "Mentioned you in a comment" : "Mentioned you in a post"
    case .repost:
      "Reposted your post"
    case .filmLogged:
      "Logged a film you watched"
    case .chatReaction:
      "Reacted to your message"
    }
  }

  var inlineActionSummary: String {
    actionSummary.prefix(1).lowercased() + actionSummary.dropFirst()
  }

  var contextTitle: String? {
    guard entity?.type == .post || entity?.type == .comment || entity?.type == .film else {
      return nil
    }

    let value = entity?.title?.trimmingCharacters(in: .whitespacesAndNewlines)
    return value?.isEmpty == false ? value : nil
  }

  var contextPreview: String? {
    let value = entity?.contentPreview?.trimmingCharacters(in: .whitespacesAndNewlines)
    return value?.isEmpty == false ? value : nil
  }

  var contextPosterURL: String? {
    let value = entity?.thumbnailUrl?.trimmingCharacters(in: .whitespacesAndNewlines)
    return value?.isEmpty == false ? value : nil
  }

  var hasDisplayContext: Bool {
    contextTitle != nil || contextPreview != nil || contextPosterURL != nil
  }

  var notificationAccessibilityLabel: String {
    var parts = [actorDisplaySummary, actionSummary]
    if let contextTitle {
      parts.append(contextTitle)
    }
    if let contextPreview {
      parts.append(contextPreview)
    }
    parts.append(createdAt.relativeDisplayString)
    return parts.joined(separator: ", ")
  }
}
