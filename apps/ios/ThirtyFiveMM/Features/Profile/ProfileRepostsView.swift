import SwiftUI

struct ProfileRepostsView: View {
  let model: ProfileViewModel
  let isActive: Bool
  let onOpenPost: (FeedPost) -> Void
  let onOpenImage: (ProfileImageSelection) -> Void

  var body: some View {
    if model.isLoadingReposts && model.reposts.isEmpty {
      ProgressView("Loading reposts")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
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
      ProgressView("Finding reposts")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
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
      LazyVStack(spacing: 0) {
        ForEach(model.reposts) { post in
          PostCard(
            post: post,
            interactor: model,
            onOpenPost: { onOpenPost(post) },
            onOpenImage: { destination in
              onOpenImage(ProfileImageSelection(destination: destination, post: post))
            }
          )

          Divider()
        }

        if model.canLoadMoreReposts || model.isLoadingMoreReposts {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding()
            .task(id: isActive ? model.reposts.count : -1) {
              guard isActive else { return }
              await model.loadMoreReposts()
            }
        }
      }
    }
  }
}
