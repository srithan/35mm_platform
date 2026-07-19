import Foundation

struct ProfileMediaSelection: Identifiable, Equatable {
  let url: URL
  let accessibilityLabel: String
  let username: String
  let isProfilePhoto: Bool

  var id: String { "\(isProfilePhoto ? "avatar" : "cover")-\(url.absoluteString)" }
}
