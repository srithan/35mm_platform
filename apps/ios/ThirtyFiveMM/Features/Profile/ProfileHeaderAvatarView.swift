import SwiftUI

struct ProfileHeaderAvatarView: View {
  let profile: PublicProfile
  let onOpen: (() -> Void)?

  var body: some View {
    if let onOpen {
      Button(action: onOpen) {
        avatar
      }
      .buttonStyle(.plain)
      .accessibilityLabel("View \(profile.displayName)'s profile photo")
      .accessibilityIdentifier("profile.avatar.preview")
    } else {
      avatar
    }
  }

  private var avatar: some View {
    ProfileAvatarView(
      url: profile.avatarUrlLg ?? profile.avatarUrl,
      displayName: profile.displayName,
      size: ProfileDesign.avatarSize
    )
    .background {
      GeometryReader { proxy in
        Color.clear
          .preference(key: ProfileAvatarFramePreferenceKey.self, value: proxy.frame(in: .global))
      }
    }
    .offset(y: -ProfileDesign.avatarOverlap)
    .padding(.bottom, -ProfileDesign.avatarOverlap)
  }
}

struct ProfileAvatarFramePreferenceKey: PreferenceKey {
  static let defaultValue: CGRect? = nil

  static func reduce(value: inout CGRect?, nextValue: () -> CGRect?) {
    value = nextValue() ?? value
  }
}
