import SwiftUI

enum ProfileAction: String, Identifiable, Equatable {
  case copyLink
  case mute
  case unmute
  case block

  var id: String { rawValue }

  static func available(for profile: PublicProfile) -> [ProfileAction] {
    if profile.isOwnProfile {
      return [.copyLink]
    }
    return [
      .copyLink,
      profile.isMutedByViewer == true ? .unmute : .mute,
      .block,
    ]
  }

  func title(username: String) -> String {
    switch self {
    case .copyLink: "Copy profile link"
    case .mute: "Mute @\(username)"
    case .unmute: "Unmute @\(username)"
    case .block: "Block @\(username)"
    }
  }

  var systemImage: String {
    switch self {
    case .copyLink: "link"
    case .mute: "speaker.slash"
    case .unmute: "speaker.wave.2"
    case .block: "person.fill.xmark"
    }
  }

  var role: ButtonRole? {
    self == .block ? .destructive : nil
  }
}
