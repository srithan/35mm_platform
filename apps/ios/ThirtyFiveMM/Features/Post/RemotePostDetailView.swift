import SwiftUI

struct RemotePostDetailView: View {
  @EnvironmentObject private var env: AppEnvironment

  let postId: String

  @State private var post: FeedPost?
  @State private var errorMessage: String?
  @State private var loadAttempt = 0

  var body: some View {
    Group {
      if let post {
        PostDetailView(post: post, apiClient: env.apiClient)
      } else if let errorMessage {
        ContentUnavailableView {
          Label("Post unavailable", systemImage: "doc.text.magnifyingglass")
        } description: {
          Text(errorMessage)
        } actions: {
          Button("Try again", action: retry)
            .buttonStyle(.borderedProminent)
        }
      } else {
        PostDetailLoadingSkeletonView()
      }
    }
    .task(id: loadAttempt) {
      await loadPost()
    }
  }

  private func loadPost() async {
    errorMessage = nil
    do {
      post = try await env.apiClient.request(.getPost(postId))
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func retry() {
    loadAttempt += 1
  }
}
