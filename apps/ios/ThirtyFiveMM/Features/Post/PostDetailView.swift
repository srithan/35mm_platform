import SwiftUI

struct PostDetailView: View {
  @EnvironmentObject private var env: AppEnvironment
  let post: FeedPost

  var body: some View {
    PostDetailContent(post: post, apiClient: env.apiClient)
  }
}

private struct PostDetailContent: View {
  @StateObject private var viewModel: PostDetailViewModel
  @State private var commentText = ""

  init(post: FeedPost, apiClient: APIClient) {
    _viewModel = StateObject(wrappedValue: PostDetailViewModel(post: post, apiClient: apiClient))
  }

  var body: some View {
    ZStack(alignment: .top) {
      ScrollView {
        LazyVStack(alignment: .leading, spacing: 0) {
          PostCard(post: viewModel.post, interactor: viewModel)

          Divider()

          Text("\(viewModel.post.commentCount) comments")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

          commentsContent
        }
      }
      .safeAreaInset(edge: .bottom) {
        CommentInputBar(
          text: $commentText,
          replyingTo: viewModel.replyingTo,
          isPosting: viewModel.isPostingComment,
          onSubmit: submitComment,
          onCancelReply: viewModel.clearReply
        )
      }
      .task {
        await viewModel.loadComments()
      }
      .navigationTitle("@\(viewModel.post.author.username)'s post")
      .navigationBarTitleDisplayMode(.inline)

      if let error = viewModel.error, !viewModel.commentTree.isEmpty {
        PostDetailErrorBanner(message: error) {
          viewModel.clearError()
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .transition(.move(edge: .top).combined(with: .opacity))
      }
    }
    .animation(.easeInOut(duration: 0.2), value: viewModel.error)
  }

  @ViewBuilder
  private var commentsContent: some View {
    if viewModel.isLoadingComments && viewModel.commentTree.isEmpty {
      ProgressView()
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
    } else if let error = viewModel.error, viewModel.commentTree.isEmpty {
      CommentLoadErrorView(message: error) {
        Task { await viewModel.loadComments() }
      }
    } else {
      ForEach(viewModel.commentTree) { node in
        CommentRow(
          node: node,
          depth: 0,
          onLike: { comment in
            Task { await viewModel.toggleCommentLike(comment: comment) }
          },
          onReply: { comment in
            viewModel.replyingTo = comment
          },
          postId: viewModel.post.id
        )
        .onAppear {
          if node.id == viewModel.commentTree.last?.id {
            Task { await viewModel.loadMoreComments() }
          }
        }

        Divider()
          .padding(.leading, 60)
      }

      if viewModel.isLoadingMore {
        ProgressView()
          .frame(maxWidth: .infinity)
          .padding()
      } else if viewModel.hasMoreComments {
        Button("Load more") {
          Task { await viewModel.loadMoreComments() }
        }
        .font(.subheadline.weight(.semibold))
        .frame(maxWidth: .infinity)
        .padding()
      }

      if viewModel.commentTree.isEmpty && !viewModel.isLoadingComments {
        Text("No comments yet")
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 32)
      }
    }
  }

  private func submitComment() {
    let draft = commentText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !draft.isEmpty else { return }

    Task {
      await viewModel.submitComment(body: draft)
      if viewModel.error == nil {
        commentText = ""
      }
    }
  }
}

private struct CommentLoadErrorView: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 12) {
      Text(message)
        .font(.callout)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)

      Button("Retry", action: retry)
        .buttonStyle(.borderedProminent)
    }
    .padding()
    .frame(maxWidth: .infinity)
  }
}

private struct PostDetailErrorBanner: View {
  let message: String
  let dismiss: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(.orange)

      Text(message)
        .font(.footnote)
        .foregroundStyle(.primary)
        .lineLimit(2)

      Spacer(minLength: 8)

      Button(action: dismiss) {
        Image(systemName: "xmark")
          .font(.caption.weight(.bold))
      }
      .buttonStyle(.plain)
      .foregroundStyle(.secondary)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
    .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
  }
}
