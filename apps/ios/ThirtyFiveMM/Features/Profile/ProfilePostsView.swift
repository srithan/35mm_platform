import SwiftUI

struct ProfilePostsView: View {
  let model: ProfileViewModel
  let isActive: Bool
  let onOpenPost: (FeedPost) -> Void
  let onOpenImage: (ProfileImageSelection) -> Void

  @State private var rendererHeight: CGFloat = 1

  var body: some View {
    if model.isLoadingPosts && model.posts.isEmpty {
      ProfilePostTabSkeleton(accessibilityLabel: "Loading posts")
    } else if let error = model.postsError, model.posts.isEmpty {
      ContentUnavailableView {
        Label("Couldn't load posts", systemImage: "exclamationmark.arrow.triangle.2.circlepath")
      } description: {
        Text(error)
      } actions: {
        Button("Try again") {
          Task { await model.retryPosts() }
        }
        .buttonStyle(.borderedProminent)
      }
    } else if model.visiblePosts.isEmpty && !model.canLoadMorePosts {
      ContentUnavailableView(
        "No posts yet",
        systemImage: "doc.text",
        description: Text(model.profile?.isOwnProfile == true ? "Your next film thought can start here." : "Nothing has been shared here yet.")
      )
    } else {
      FeedCollectionView(
        posts: model.visiblePosts,
        interactor: model,
        isScrollEnabled: false,
        canLoadMore: isActive && model.canLoadMorePosts,
        isLoadingMore: model.isLoadingMorePosts,
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
          Task { await model.loadMorePosts() }
        },
        onScrollDirectionChange: { _ in },
        onContentHeightChange: { height in
          rendererHeight = height
        },
        currentProfileUsername: model.profile?.username ?? model.username,
        currentProfileUserId: model.profile?.userId
      )
      .frame(height: rendererHeight)

      if model.isLoadingMorePosts {
        ProfilePostTabPaginationSkeleton()
      }
    }
  }
}
