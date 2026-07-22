import SwiftUI

struct ProfileTabPage: View {
  let tab: ProfileTab
  let profile: PublicProfile
  let model: ProfileViewModel
  let isActive: Bool
  let isPrivateGate: Bool
  let onOpenPost: (FeedPost) -> Void
  let onOpenImage: (ProfileImageSelection) -> Void

  var body: some View {
    VStack(spacing: 0) {
      if isPrivateGate {
        ContentUnavailableView(
          "This account is private",
          systemImage: "lock.fill",
          description: Text("Follow \(profile.displayName) to see their posts.")
        )
        .padding(.vertical, 32)
      } else {
        tabContent
      }
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .accessibilityIdentifier("profile.tab.page.\(tab.rawValue)")
  }

  @ViewBuilder
  private var tabContent: some View {
    switch tab {
    case .posts:
      ProfilePostsView(
        model: model,
        isActive: isActive,
        onOpenPost: onOpenPost,
        onOpenImage: onOpenImage
      )
    case .reposts:
      ProfileRepostsView(
        model: model,
        isActive: isActive,
        onOpenPost: onOpenPost,
        onOpenImage: onOpenImage
      )
    case .diary:
      ProfileDiaryView(model: model, isActive: isActive, onOpenPost: onOpenPost)
    case .lists:
      ProfileListsView(model: model, isActive: isActive)
    case .stats:
      ProfileStatsView(model: model)
    }
  }
}
