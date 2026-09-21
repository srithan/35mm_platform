import SwiftUI

struct PostDetailView: View {
  @Environment(\.theme) private var theme
  let post: FeedPost
  private let apiClient: APIClient?

  init(post: FeedPost, apiClient: APIClient? = nil) {
    self.post = post
    self.apiClient = apiClient
  }

  var body: some View {
    Group {
      if let apiClient {
        PostDetailContent(post: post, apiClient: apiClient)
      } else {
        EnvironmentPostDetailContent(post: post)
      }
    }
  }
}

private struct EnvironmentPostDetailContent: View {
  @Environment(\.theme) private var theme
  @EnvironmentObject private var env: AppEnvironment
  let post: FeedPost

  var body: some View {
    PostDetailContent(post: post, apiClient: env.apiClient)
  }
}

private struct PostDetailContent: View {
  @Environment(\.theme) private var theme
  @StateObject private var viewModel: PostDetailViewModel
  @State private var commentText = ""
  @State private var isCommentComposerExpanded = false

  init(post: FeedPost, apiClient: APIClient) {
    _viewModel = StateObject(wrappedValue: PostDetailViewModel(post: post, apiClient: apiClient))
  }

  var body: some View {
    ZStack(alignment: .top) {
      ScrollView {
        LazyVStack(alignment: .leading, spacing: 0) {
          PostCard(post: viewModel.post, interactor: viewModel, truncatesBody: false)

          Divider()

          Text("\(viewModel.post.commentCount) comments")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(theme.text)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

          CommentInputBar(
            text: $commentText,
            isExpanded: $isCommentComposerExpanded,
            replyingTo: viewModel.replyingTo,
            postAuthor: viewModel.post.author,
            isPosting: viewModel.isPostingComment,
            onSubmit: submitComment,
            onCancel: cancelComment
          )

          commentsContent
        }
      }
      .task {
        await viewModel.loadComments()
      }
      .navigationTitle("@\(viewModel.post.author.username)'s post")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar(.visible, for: .navigationBar)
      .toolbarBackground(theme.bg, for: .navigationBar)
      .toolbarBackground(.visible, for: .navigationBar)
      .modifier(ThemedNavigationBarColorSchemeModifier())
      .themedBackground()

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
      CommentSkeletonList()
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
            isCommentComposerExpanded = true
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
        CommentPaginationSkeleton()
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
          .foregroundStyle(theme.textSecondary)
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
        isCommentComposerExpanded = false
      }
    }
  }

  private func cancelComment() {
    commentText = ""
    isCommentComposerExpanded = false
    viewModel.clearReply()
  }
}

struct PostDetailLoadingSkeletonView: View {
  @Environment(\.theme) private var theme

  var body: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: 0) {
        FeedPostSkeletonCard(index: 0)

        Divider()

        RoundedRectangle(cornerRadius: 4)
          .fill(theme.fillStrong)
          .frame(width: 116, height: 14)
          .padding(.horizontal, 16)
          .padding(.vertical, 12)

        CommentComposerSkeleton()

        CommentSkeletonList(rowCount: 5)
      }
    }
    .themedBackground()
    .redacted(reason: .placeholder)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Loading post")
    .accessibilityIdentifier("post.detail.loading.skeleton")
  }
}

private struct CommentComposerSkeleton: View {
  @Environment(\.theme) private var theme

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      Circle()
        .fill(theme.bgSunken)
        .frame(width: 32, height: 32)

      VStack(alignment: .leading, spacing: 8) {
        RoundedRectangle(cornerRadius: 4)
          .fill(theme.fillStrong)
          .frame(height: 14)

        RoundedRectangle(cornerRadius: 18)
          .fill(theme.bgSunken)
          .frame(height: 40)
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .accessibilityHidden(true)
  }
}

private struct CommentSkeletonList: View {
  var rowCount = 4

  var body: some View {
    LazyVStack(spacing: 0) {
      ForEach(0..<rowCount, id: \.self) { index in
        CommentSkeletonRow(index: index)

        Divider()
          .padding(.leading, 60)
      }
    }
    .redacted(reason: .placeholder)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Loading comments")
    .accessibilityIdentifier("post.comments.loading.skeleton")
  }
}

private struct CommentPaginationSkeleton: View {
  var body: some View {
    VStack(spacing: 0) {
      ForEach(0..<2, id: \.self) { index in
        CommentSkeletonRow(index: index + 4, isCompact: true)

        Divider()
          .padding(.leading, 60)
      }
    }
    .redacted(reason: .placeholder)
    .accessibilityHidden(true)
  }
}

private struct CommentSkeletonRow: View {
  @Environment(\.theme) private var theme

  let index: Int
  var isCompact = false

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      Circle()
        .fill(theme.bgSunken)
        .frame(width: 32, height: 32)

      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .top, spacing: 8) {
          VStack(alignment: .leading, spacing: 6) {
            skeletonLine(width: index.isMultiple(of: 2) ? 132 : 98, height: 12)
            skeletonLine(width: 76, height: 10)
          }

          Spacer(minLength: 0)

          skeletonLine(width: 24, height: 8)
        }

        VStack(alignment: .leading, spacing: 6) {
          skeletonLine(width: nil, height: 13)
          skeletonLine(width: index.isMultiple(of: 2) ? 206 : 252, height: 13)
          if !isCompact {
            skeletonLine(width: 148, height: 13)
          }
        }

        HStack(spacing: 26) {
          ForEach(0..<3, id: \.self) { actionIndex in
            HStack(spacing: 6) {
              Circle()
                .fill(theme.fillStrong)
                .frame(width: 18, height: 18)

              if actionIndex < 2 {
                skeletonLine(width: 20, height: 10)
              }
            }
          }
        }
        .padding(.top, 2)
      }
    }
    .padding(.horizontal, DesignSystem.Spacing.screenHorizontal)
    .padding(.vertical, 12)
    .accessibilityHidden(true)
  }

  private func skeletonLine(width: CGFloat?, height: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 4)
      .fill(theme.fillStrong)
      .frame(width: width, height: height)
  }
}

private struct CommentLoadErrorView: View {
  @Environment(\.theme) private var theme
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 12) {
      Text(message)
        .font(.callout)
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)

      Button("Retry", action: retry)
        .buttonStyle(.borderedProminent)
    }
    .padding()
    .frame(maxWidth: .infinity)
  }
}

private struct PostDetailErrorBanner: View {
  @Environment(\.theme) private var theme
  let message: String
  let dismiss: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(.orange)

      Text(message)
        .font(.footnote)
        .foregroundStyle(theme.text)
        .lineLimit(2)

      Spacer(minLength: 8)

      Button(action: dismiss) {
        Image(systemName: "xmark")
          .font(.caption.weight(.bold))
      }
      .buttonStyle(.plain)
      .foregroundStyle(theme.textSecondary)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
    .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
  }
}
