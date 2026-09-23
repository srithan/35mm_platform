import SwiftUI

struct ProfileRepostsView: View {
  let model: ProfileViewModel
  let isActive: Bool
  let onOpenPost: (FeedPost) -> Void
  let onOpenImage: (ProfileImageSelection) -> Void

  @State private var rendererHeight: CGFloat = 1

  var body: some View {
    if model.isLoadingReposts && model.reposts.isEmpty {
      ProfilePostTabSkeleton(accessibilityLabel: "Loading reposts")
    } else if let error = model.repostsError, model.reposts.isEmpty {
      ContentUnavailableView {
        Label("Couldn't load reposts", systemImage: "exclamationmark.arrow.triangle.2.circlepath")
      } description: {
        Text(error)
      } actions: {
        Button("Try again") {
          Task { await model.retryReposts() }
        }
        .buttonStyle(.borderedProminent)
      }
    } else if model.reposts.isEmpty && model.canLoadMoreReposts {
      ProfilePostTabSkeleton(accessibilityLabel: "Finding reposts")
        .task(id: isActive ? model.reposts.count : -1) {
          if isActive {
            await model.loadMoreReposts()
          }
        }
    } else if model.reposts.isEmpty {
      ContentUnavailableView(
        "No reposts yet",
        systemImage: "arrow.2.squarepath",
        description: Text(
          model.profile?.isOwnProfile == true
            ? "Posts you repost will appear here."
            : "Nothing has been reposted here yet."
        )
      )
    } else {
      FeedCollectionView(
        posts: model.reposts,
        interactor: model,
        isScrollEnabled: false,
        canLoadMore: isActive && model.canLoadMoreReposts,
        isLoadingMore: model.isLoadingMoreReposts,
        topContentInset: 0,
        bottomContentInset: 0,
        onOpenPost: onOpenPost,
        onOpenImage: { context, post in
          onOpenImage(ProfileImageSelection(
            destination: context.destination,
            post: post,
            transitionSource: context.transitionSource
          ))
        },
        onLoadMore: {
          guard isActive else { return }
          Task { await model.loadMoreReposts() }
        },
        onScrollDirectionChange: { _ in },
        onContentHeightChange: { height in
          rendererHeight = height
        },
        currentProfileUsername: model.profile?.username ?? model.username,
        currentProfileUserId: model.profile?.userId
      )
      .frame(height: rendererHeight)

      if model.isLoadingMoreReposts {
        ProfilePostTabPaginationSkeleton()
      }
    }
  }
}
