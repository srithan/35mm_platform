import SwiftUI

struct ProfileDiaryView: View {
  let model: ProfileViewModel
  let onOpenPost: (FeedPost) -> Void

  var body: some View {
    if model.isLoadingPosts && model.posts.isEmpty {
      ProgressView("Loading diary")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    } else if let error = model.postsError, model.posts.isEmpty {
      ContentUnavailableView {
        Label("Couldn't load diary", systemImage: "film.stack")
      } description: {
        Text(error)
      } actions: {
        Button("Try again") {
          Task { await model.retryPosts() }
        }
        .buttonStyle(.borderedProminent)
      }
    } else if model.diaryPosts.isEmpty && model.canLoadMorePosts {
      ProgressView("Finding diary entries")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .task(id: model.posts.count) {
          await model.loadMorePosts()
        }
    } else if model.diaryPosts.isEmpty {
      ContentUnavailableView(
        "No films logged yet",
        systemImage: "film.stack",
        description: Text(model.profile?.isOwnProfile == true ? "Logs and reviews will build your film diary." : "No diary entries have been shared.")
      )
    } else {
      VStack(alignment: .leading, spacing: 18) {
        ForEach(model.diarySections) { section in
          VStack(alignment: .leading, spacing: 10) {
            Text(section.month, format: .dateTime.month(.wide).year())
              .font(.subheadline)
              .bold()
              .foregroundStyle(.secondary)
              .textCase(.uppercase)

            ForEach(section.posts) { post in
              ProfileDiaryRow(post: post) {
                onOpenPost(post)
              }
            }
          }
        }

        if model.canLoadMorePosts || model.isLoadingMorePosts {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding()
            .task(id: model.posts.count) {
              await model.loadMorePosts()
            }
        }
      }
      .padding(ProfileDesign.horizontalPadding)
    }
  }
}
