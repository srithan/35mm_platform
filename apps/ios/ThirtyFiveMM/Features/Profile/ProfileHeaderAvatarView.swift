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
    .offset(y: -ProfileDesign.avatarOverlap)
    .padding(.bottom, -ProfileDesign.avatarOverlap)
  }
}
