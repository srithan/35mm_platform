import SwiftUI
import UIKit

enum FeedScrollDirection {
  case up
  case down
}

struct FeedView: View {
  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel: FeedViewModel
  @State private var selectedPost: FeedPost?
  @State private var selectedImage: FeedImageSelection?
  @State private var lastScrollOffset: CGFloat?

  private let onScrollDirectionChange: (FeedScrollDirection) -> Void

  init(
    apiClient: APIClient,
    onScrollDirectionChange: @escaping (FeedScrollDirection) -> Void = { _ in }
  ) {
    _viewModel = StateObject(wrappedValue: FeedViewModel(apiClient: apiClient))
    self.onScrollDirectionChange = onScrollDirectionChange
  }

  var body: some View {
    ZStack(alignment: .top) {
      content

      if let error = viewModel.error, !viewModel.posts.isEmpty {
        ErrorBanner(message: error) {
          viewModel.clearError()
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .transition(.move(edge: .top).combined(with: .opacity))
      }

    }
    .animation(.easeInOut(duration: 0.2), value: viewModel.error)
    .fullScreenCover(item: $selectedImage) { imageSelection in
      PostImageViewerView(
        destination: imageSelection.destination,
        metrics: PostImageViewerMetrics(
          likeCount: imageSelection.post.likeCount,
          commentCount: imageSelection.post.commentCount,
          repostCount: imageSelection.post.repostCount,
          shareCount: imageSelection.post.bookmarkCount,
          isLiked: imageSelection.post.isLiked
        ),
        onClose: {
          clearSelectedImage()
        },
        onLike: {
          Task { await viewModel.toggleLike(postId: imageSelection.post.id) }
        },
        onComment: {
          clearSelectedImage()
          selectedPost = imageSelection.post
        },
        onRepost: {
          Task { await viewModel.toggleRepost(postId: imageSelection.post.id) }
        },
        onShare: {
          UIPasteboard.general.string = "https://35mm.app/posts/\(imageSelection.post.id)"
        }
      )
      .presentationBackground(.black)
      .transaction { transaction in
        transaction.animation = nil
      }
    }
    .refreshable {
      await viewModel.refresh()
    }
    .task {
      await viewModel.loadInitial()
    }
    .navigationDestination(item: $selectedPost) { post in
      PostDetailView(post: post)
        .environmentObject(env)
    }
  }

  @ViewBuilder
  private var content: some View {
    if viewModel.isLoading && viewModel.posts.isEmpty {
      ProgressView()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    } else if let error = viewModel.error, viewModel.posts.isEmpty {
      FeedErrorView(message: error) {
        Task { await viewModel.loadInitial() }
      }
    } else {
      ScrollView {
        GeometryReader { proxy in
          Color.clear
            .preference(
              key: FeedScrollOffsetPreferenceKey.self,
              value: proxy.frame(in: .named("feed-scroll")).minY
            )
        }
        .frame(height: 0)

        LazyVStack(spacing: 0) {
          ForEach(viewModel.posts) { post in
            PostCard(
              post: post,
              interactor: viewModel,
              onOpenPost: {
                selectedPost = post
              },
              onOpenImage: { destination in
                var transaction = Transaction()
                transaction.disablesAnimations = true
                withTransaction(transaction) {
                  selectedImage = FeedImageSelection(destination: destination, post: post)
                }
              }
            )
            .onAppear {
              if post.id == viewModel.posts.last?.id {
                Task { await viewModel.loadMore() }
              }
            }

            Divider()
          }

          if viewModel.isLoadingMore {
            ProgressView()
              .padding()
          }

          if viewModel.posts.isEmpty && !viewModel.isLoading {
            // TODO: Design empty feed state.
            Color.clear.frame(height: 1)
          }
        }
      }
      .coordinateSpace(name: "feed-scroll")
      .onPreferenceChange(FeedScrollOffsetPreferenceKey.self) { offset in
        handleScrollOffset(offset)
      }
    }
  }

  private func handleScrollOffset(_ offset: CGFloat) {
    defer { lastScrollOffset = offset }

    guard let lastScrollOffset else {
      if offset > -24 {
        onScrollDirectionChange(.up)
      }
      return
    }

    let delta = offset - lastScrollOffset

    if offset > -24 {
      onScrollDirectionChange(.up)
      return
    }

    if delta < -8 {
      onScrollDirectionChange(.down)
    } else if delta > 8 {
      onScrollDirectionChange(.up)
    }
  }

  private func clearSelectedImage() {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      selectedImage = nil
    }
  }
}

private struct FeedImageSelection: Identifiable, Equatable {
  let destination: PostImageDestination
  let post: FeedPost

  var id: String {
    "\(post.id)-\(destination.url)"
  }

  static func == (lhs: FeedImageSelection, rhs: FeedImageSelection) -> Bool {
    lhs.id == rhs.id
  }
}

private struct FeedScrollOffsetPreferenceKey: PreferenceKey {
  static let defaultValue: CGFloat = 0

  static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
    value = nextValue()
  }
}

private struct FeedErrorView: View {
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
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct ErrorBanner: View {
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
