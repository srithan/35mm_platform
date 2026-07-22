import Foundation

extension FollowRequest {
  var resolvedDisplayName: String {
    let value = displayName?.trimmingCharacters(in: .whitespacesAndNewlines)
    return value?.isEmpty == false ? value ?? username : username
  }

  var profileSubtitle: String {
    guard mutualFollowerCount > 0 else { return "@\(username)" }
    let noun = mutualFollowerCount == 1 ? "mutual" : "mutuals"
    return "@\(username) · \(mutualFollowerCount) \(noun)"
  }

  static func summarySubtitle(requests: [FollowRequest], total: Int) -> String {
    guard total > 0 else { return "No pending requests" }

    guard let first = requests.first else {
      let noun = total == 1 ? "request" : "requests"
      return "\(total) pending \(noun)"
    }

    guard total > 1 else { return first.username }
    let remaining = total - 1
    return "\(first.username) + \(remaining) \(remaining == 1 ? "other" : "others")"
  }
}
