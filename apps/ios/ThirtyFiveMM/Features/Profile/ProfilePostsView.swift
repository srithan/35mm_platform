import SwiftUI

struct ProfilePostsView: View {
  let model: ProfileViewModel
  let onOpenPost: (FeedPost) -> Void
  let onOpenImage: (ProfileImageSelection) -> Void

  var body: some View {
    if model.isLoadingPosts && model.posts.isEmpty {
      ProgressView("Loading posts")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
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
      ForEach(model.visiblePosts) { post in
        PostCard(
          post: post,
          interactor: model,
          onOpenPost: { onOpenPost(post) },
          onOpenImage: { destination in
            onOpenImage(ProfileImageSelection(destination: destination, post: post))
          }
        )
        .onAppear {
          if post.id == model.visiblePosts.last?.id {
            Task { await model.loadMorePosts() }
          }
        }

        Divider()
      }

      if model.isLoadingMorePosts {
        ProgressView()
          .frame(maxWidth: .infinity)
          .padding()
      }
    }
  }
}
