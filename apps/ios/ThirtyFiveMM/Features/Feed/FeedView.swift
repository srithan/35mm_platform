import SwiftUI
import UIKit

enum ScrollChromeDirection {
  case top
  case up
  case down

  static let topLock: CGFloat = 12
  static let hideDelta: CGFloat = 8
  static let showDelta: CGFloat = 2
  static let hideVelocity: CGFloat = -24
  static let showVelocity: CGFloat = 12
}

struct FeedView: View {
  @Environment(\.theme) private var theme
  @Environment(\.appRouteNavigator) private var appRouteNavigator
  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel: FeedViewModel
  @State private var selectedImage: FeedImageSelection?

  private let onScrollDirectionChange: (ScrollChromeDirection) -> Void
  private let topContentInset: CGFloat
  private let bottomContentInset: CGFloat

  init(
    apiClient: APIClient,
    topContentInset: CGFloat = 0,
    bottomContentInset: CGFloat = 0,
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void = { _ in }
  ) {
    _viewModel = StateObject(wrappedValue: FeedViewModel(apiClient: apiClient))
    self.topContentInset = topContentInset
    self.bottomContentInset = bottomContentInset
    self.onScrollDirectionChange = onScrollDirectionChange
  }

  init(
    viewModel: FeedViewModel,
    topContentInset: CGFloat = 0,
    bottomContentInset: CGFloat = 0,
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void = { _ in }
  ) {
    _viewModel = StateObject(wrappedValue: viewModel)
    self.topContentInset = topContentInset
    self.bottomContentInset = bottomContentInset
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
          isLiked: imageSelection.post.isLiked,
          isReposted: imageSelection.post.isReposted
        ),
        onClose: {
          clearSelectedImage()
        },
        onLike: {
          Task { await viewModel.toggleLike(postId: imageSelection.post.id) }
        },
        onComment: {
          clearSelectedImage()
          appRouteNavigator(.post(PostDestination(post: imageSelection.post)))
        },
        onRepost: {
          Task { await viewModel.toggleRepost(postId: imageSelection.post.id) }
        },
        onQuote: {
          env.presentComposer(quoting: imageSelection.post)
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
    .task {
      await viewModel.loadInitialIfNeeded()
    }
    .onChange(of: env.lastCreatedPost?.id) {
      guard let createdPost = env.lastCreatedPost else { return }
      viewModel.prependCreatedPost(createdPost)
    }
  }

  @ViewBuilder
  private var content: some View {
    if viewModel.isLoading && viewModel.posts.isEmpty {
      FeedSkeletonList(
        topContentInset: topContentInset,
        bottomContentInset: bottomContentInset
      )
    } else if let error = viewModel.error, viewModel.posts.isEmpty {
      FeedErrorView(message: error) {
        Task { await viewModel.loadInitial() }
      }
    } else if viewModel.posts.isEmpty {
      FeedEmptyView()
    } else {
      FeedCollectionView(
        posts: viewModel.posts,
        interactor: viewModel,
        canLoadMore: viewModel.hasMore,
        isLoadingMore: viewModel.isLoadingMore,
        topContentInset: topContentInset,
        bottomContentInset: bottomContentInset,
        isRefreshing: viewModel.isLoading,
        onOpenImage: { destination, post in
          var transaction = Transaction()
          transaction.disablesAnimations = true
          withTransaction(transaction) {
            selectedImage = FeedImageSelection(destination: destination, post: post)
          }
        },
        onRefresh: {
          guard !viewModel.isLoading, !viewModel.isLoadingMore else {
            return false
          }
          Task { [weak feedViewModel = viewModel] in
            await feedViewModel?.refresh()
          }
          return true
        },
        onLoadMore: {
          Task { [weak feedViewModel = viewModel] in
            await feedViewModel?.loadMore()
          }
        },
        onScrollDirectionChange: onScrollDirectionChange
      )
      .themedBackground()
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

@MainActor
struct ScrollChromeObserver: UIViewRepresentable {
  let onDirectionChange: (ScrollChromeDirection) -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(onDirectionChange: onDirectionChange)
  }

  func makeUIView(context: Context) -> FeedScrollObserverView {
    let view = FeedScrollObserverView(frame: .zero)
    view.isUserInteractionEnabled = false
    view.onHierarchyChanged = { [coordinator = context.coordinator] observerView in
      coordinator.attach(from: observerView)
    }

    return view
  }

  func updateUIView(_ uiView: FeedScrollObserverView, context: Context) {
    context.coordinator.onDirectionChange = onDirectionChange
    uiView.onHierarchyChanged = { [coordinator = context.coordinator] observerView in
      coordinator.attach(from: observerView)
    }
    uiView.attachIfPossible()
  }

  @MainActor
  final class Coordinator: NSObject {
    var onDirectionChange: (ScrollChromeDirection) -> Void

    private weak var scrollView: UIScrollView?
    private weak var observedPanGesture: UIPanGestureRecognizer?
    private var lastTranslationY: CGFloat?
    private var lastDirection: ScrollChromeDirection = .top

    init(onDirectionChange: @escaping (ScrollChromeDirection) -> Void) {
      self.onDirectionChange = onDirectionChange
    }

    func attach(from view: UIView) {
      guard let scrollView = view.enclosingScrollView, scrollView !== self.scrollView else {
        return
      }

      observedPanGesture?.removeTarget(self, action: #selector(scrollViewPanGestureChanged(_:)))
      self.scrollView = scrollView
      observedPanGesture = scrollView.panGestureRecognizer
      scrollView.panGestureRecognizer.addTarget(self, action: #selector(scrollViewPanGestureChanged(_:)))
      handleScrollPosition(scrollView.contentOffset.y)
    }

    @objc private func scrollViewPanGestureChanged(_ recognizer: UIPanGestureRecognizer) {
      guard let scrollView else { return }
      let offset = scrollView.contentOffset.y
      let translationY = recognizer.translation(in: scrollView).y

      switch recognizer.state {
      case .began:
        lastTranslationY = translationY
        handleScrollPosition(offset)
        return
      case .changed:
        break
      case .ended, .cancelled, .failed:
        lastTranslationY = nil
        handleScrollPosition(offset)
        return
      default:
        return
      }

      let previousTranslationY = lastTranslationY ?? translationY
      let translationDelta = translationY - previousTranslationY
      let velocityY = recognizer.velocity(in: scrollView).y
      lastTranslationY = translationY

      if offset <= ScrollChromeDirection.topLock {
        report(.top)
        return
      }

      if translationDelta < -ScrollChromeDirection.hideDelta || velocityY < ScrollChromeDirection.hideVelocity {
        report(.down)
      } else if translationDelta > ScrollChromeDirection.showDelta || velocityY > ScrollChromeDirection.showVelocity {
        report(.up)
      }
    }

    private func handleScrollPosition(_ offset: CGFloat) {
      if offset <= ScrollChromeDirection.topLock {
        report(.top)
      }
    }

    private func report(_ direction: ScrollChromeDirection) {
      guard direction != lastDirection else { return }

      lastDirection = direction
      onDirectionChange(direction)
    }
  }
}

@MainActor
final class FeedScrollObserverView: UIView {
  var onHierarchyChanged: ((FeedScrollObserverView) -> Void)?

  override func didMoveToSuperview() {
    super.didMoveToSuperview()
    attachIfPossible()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    attachIfPossible()
  }

  func attachIfPossible() {
    onHierarchyChanged?(self)
  }
}

@MainActor
private extension UIView {
  var enclosingScrollView: UIScrollView? {
    var view = superview

    while let candidate = view {
      if let scrollView = candidate as? UIScrollView {
        return scrollView
      }

      view = candidate.superview
    }

    return nil
  }
}

private struct FeedSkeletonList: View {
  let topContentInset: CGFloat
  let bottomContentInset: CGFloat

  var body: some View {
    ScrollView {
      Color.clear
        .frame(height: topContentInset)
        .accessibilityHidden(true)

      LazyVStack(spacing: 0) {
        ForEach(0..<5, id: \.self) { index in
          FeedPostSkeletonCard(index: index)
          Divider()
        }
      }

      Color.clear
        .frame(height: bottomContentInset)
        .accessibilityHidden(true)
    }
    .themedBackground()
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Loading feed")
    .accessibilityIdentifier("feed.loading.skeleton")
  }
}

private struct FeedPaginationSkeleton: View {
  var body: some View {
    VStack(spacing: 0) {
      ForEach(0..<2, id: \.self) { index in
        FeedPostSkeletonCard(index: index + 5, isCompact: true)
        Divider()
      }
    }
    .accessibilityHidden(true)
  }
}

struct FeedPostSkeletonCard: View {
  @Environment(\.theme) private var theme

  let index: Int
  var isCompact = false

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Circle()
        .fill(theme.bgSunken)
        .frame(width: 40, height: 40)

      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .top, spacing: 8) {
          VStack(alignment: .leading, spacing: 6) {
            skeletonLine(width: index.isMultiple(of: 2) ? 154 : 118, height: 13)
            skeletonLine(width: 96, height: 11)
          }

          Spacer(minLength: 0)

          skeletonLine(width: 28, height: 8)
        }

        VStack(alignment: .leading, spacing: 6) {
          skeletonLine(width: nil, height: 13)
          skeletonLine(width: index.isMultiple(of: 2) ? 238 : 286, height: 13)
          if !isCompact {
            skeletonLine(width: 172, height: 13)
          }
        }

        if !isCompact {
          RoundedRectangle(cornerRadius: DesignSystem.Radius.medium)
            .fill(theme.bgSunken)
            .frame(height: index.isMultiple(of: 2) ? 168 : 96)
        }

        HStack(spacing: 34) {
          ForEach(0..<4, id: \.self) { _ in
            HStack(spacing: 6) {
              Circle()
                .fill(theme.fillStrong)
                .frame(width: 18, height: 18)
              skeletonLine(width: 24, height: 10)
            }
          }
        }
        .padding(.top, 2)
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .redacted(reason: .placeholder)
    .accessibilityHidden(true)
  }

  private func skeletonLine(width: CGFloat?, height: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 4)
      .fill(theme.fillStrong)
      .frame(width: width, height: height)
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

private struct FeedErrorView: View {
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
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct FeedEmptyView: View {
  @Environment(\.theme) private var theme

  var body: some View {
    ContentUnavailableView {
      Label("No posts yet", systemImage: "film.stack")
    } description: {
      Text("Follow people or create the first post in your feed.")
        .foregroundStyle(theme.textSecondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .themedBackground()
  }
}

private struct ErrorBanner: View {
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
