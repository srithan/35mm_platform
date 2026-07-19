import SwiftUI

struct ProfileCountsView: View {
  let profile: PublicProfile

  var body: some View {
    HStack(spacing: 16) {
      ProfileInlineCount(value: profile.followingCount, label: "Following")
      ProfileInlineCount(value: profile.followerCount, label: "Followers")
      ProfileInlineCount(value: profile.filmsLoggedCount, label: "Films")
    }
    .accessibilityElement(children: .combine)
  }
}
