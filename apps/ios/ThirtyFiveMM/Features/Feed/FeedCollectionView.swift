import Kingfisher
import SwiftUI
import UIKit

/// Shared feed renderer architecture note:
/// - `FeedCollectionView` owns the UIKit list surface for Home and Profile posts/reposts:
///   compositional self-sizing rows, diffable snapshots keyed only by stable post ID,
///   and shape-specific reuse IDs.
/// - UIKit owns self-sizing measurements. Hosted content has a required row width and
///   intrinsic height; no second, stale post-height cache competes with that layout.
/// - Prefetch runs through `UICollectionViewDataSourcePrefetching`: upcoming images are
///   prepared and canceled by UIKit demand, and page fetches trigger
///   when visible/prefetched rows reach five from the loaded tail.
/// - View models remain source of truth for API state, cursor pagination, private-profile
///   gating, and optimistic interactions; this renderer owns only UIKit rendering mechanics.
struct FeedCollectionView: UIViewControllerRepresentable {
  @Environment(\.theme) private var theme
  @Environment(\.appRouteNavigator) private var appRouteNavigator
  @EnvironmentObject private var env: AppEnvironment

  let posts: [FeedPost]
  let interactor: any PostInteracting
  var isScrollEnabled = true
  var canLoadMore = true
  let isLoadingMore: Bool
  let topContentInset: CGFloat
  let bottomContentInset: CGFloat
  var isRefreshing = false
  var onOpenPost: ((FeedPost) -> Void)?
  let onOpenImage: (PostImageOpenContext, FeedPost) -> Void
  var onRefresh: (() -> Bool)?
  let onLoadMore: () -> Void
  let onScrollDirectionChange: (ScrollChromeDirection) -> Void
  var onContentHeightChange: (CGFloat) -> Void = { _ in }
  var currentProfileUsername: String? = nil
  var currentProfileUserId: String? = nil

  func makeUIViewController(context: Context) -> FeedCollectionViewController {
    let controller = FeedCollectionViewController(
      onLoadMore: onLoadMore,
      onScrollDirectionChange: onScrollDirectionChange
    )
    controller.onRefresh = onRefresh
    controller.configure(
      posts: posts,
      interactor: interactor,
      env: env,
      theme: theme,
      navigator: appRouteNavigator,
      isScrollEnabled: isScrollEnabled,
      canLoadMore: canLoadMore,
      topContentInset: topContentInset,
      bottomContentInset: bottomContentInset,
      isRefreshing: isRefreshing,
      isLoadingMore: isLoadingMore,
      currentProfileUsername: currentProfileUsername,
      currentProfileUserId: currentProfileUserId,
      onOpenPost: onOpenPost,
      onOpenImage: onOpenImage
    )
    controller.onContentHeightChange = onContentHeightChange
    return controller
  }

  func updateUIViewController(_ controller: FeedCollectionViewController, context: Context) {
    controller.onLoadMore = onLoadMore
    controller.onScrollDirectionChange = onScrollDirectionChange
    controller.onRefresh = onRefresh
    controller.configure(
      posts: posts,
      interactor: interactor,
      env: env,
      theme: theme,
      navigator: appRouteNavigator,
      isScrollEnabled: isScrollEnabled,
      canLoadMore: canLoadMore,
      topContentInset: topContentInset,
      bottomContentInset: bottomContentInset,
      isRefreshing: isRefreshing,
      isLoadingMore: isLoadingMore,
      currentProfileUsername: currentProfileUsername,
      currentProfileUserId: currentProfileUserId,
      onOpenPost: onOpenPost,
      onOpenImage: onOpenImage
    )
    controller.onContentHeightChange = onContentHeightChange
  }

}

@MainActor
final class FeedCollectionViewController: UIViewController {
  typealias DataSource = UICollectionViewDiffableDataSource<Int, String>
  typealias Snapshot = NSDiffableDataSourceSnapshot<Int, String>

  var onLoadMore: () -> Void
  var onRefresh: (() -> Bool)?
  var onScrollDirectionChange: (ScrollChromeDirection) -> Void
  var onContentHeightChange: (CGFloat) -> Void = { _ in }

  private let imagePrefetcher = FeedImagePrefetcher()
  private var collectionView: UICollectionView!
  private var dataSource: DataSource!
  private let refreshControl = UIRefreshControl()
  private var posts: [FeedPost] = []
  private var postByID: [String: FeedPost] = [:]
  private weak var interactor: (any PostInteracting)?
  private weak var env: AppEnvironment?
  private var theme: ThemePalette?
  private var navigator: AppRouteNavigator = .noop
  private var onOpenPost: ((FeedPost) -> Void)?
  private var onOpenImage: (PostImageOpenContext, FeedPost) -> Void = { _, _ in }
  private var isScrollEnabled = true
  private var canLoadMore = true
  private var isLoadingMore = false
  private var isRefreshing = false
  private var currentProfileUsername: String?
  private var currentProfileUserId: String?
  private var lastRequestedTailPostID: String?
  private var lastTranslationY: CGFloat?
  private var lastDirection: ScrollChromeDirection = .top
  private var appliedPosts: [FeedPost] = []
  private var isApplyingSnapshot = false
  private var reconfigureAll = false
  private var hasPositionedInitialContent = false
  private var lastReportedContentHeight: CGFloat?
  private var contentHeightReportScheduled = false
  private var scrollAnchor: ScrollAnchor?
  private var isRestoringScrollAnchor = false

  init(
    onLoadMore: @escaping () -> Void,
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void
  ) {
    self.onLoadMore = onLoadMore
    self.onScrollDirectionChange = onScrollDirectionChange
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    let feedCollection = FeedSizingCollectionView(frame: .zero, collectionViewLayout: makeLayout())
    collectionView = feedCollection
    feedCollection.onLayout = { [weak self] in
      guard let self else { return }
      self.restoreScrollAnchor(self.scrollAnchor)
      self.reportContentHeight()
    }
    collectionView.translatesAutoresizingMaskIntoConstraints = false
    collectionView.backgroundColor = .clear
    // SwiftUI's shell already owns safe areas; these insets are overlay chrome only.
    collectionView.contentInsetAdjustmentBehavior = .never
    collectionView.alwaysBounceVertical = true
    collectionView.isScrollEnabled = true
    refreshControl.addTarget(self, action: #selector(refreshControlTriggered), for: .valueChanged)
    collectionView.refreshControl = refreshControl
    collectionView.prefetchDataSource = self
    collectionView.delegate = self
    collectionView.register(
      FeedHostingCollectionViewCell.self,
      forCellWithReuseIdentifier: FeedPostCellRegistration.ReuseIdentifier.text.rawValue
    )
    collectionView.register(
      FeedHostingCollectionViewCell.self,
      forCellWithReuseIdentifier: FeedPostCellRegistration.ReuseIdentifier.review.rawValue
    )
    collectionView.register(
      FeedHostingCollectionViewCell.self,
      forCellWithReuseIdentifier: FeedPostCellRegistration.ReuseIdentifier.media.rawValue
    )
    collectionView.register(
      FeedHostingCollectionViewCell.self,
      forCellWithReuseIdentifier: FeedPostCellRegistration.ReuseIdentifier.poll.rawValue
    )
    collectionView.register(
      FeedHostingCollectionViewCell.self,
      forCellWithReuseIdentifier: FeedPostCellRegistration.ReuseIdentifier.footer.rawValue
    )
    view.addSubview(collectionView)
    NSLayoutConstraint.activate([
      collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      collectionView.topAnchor.constraint(equalTo: view.topAnchor),
      collectionView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    configureDataSource()
  }

  func configure(
    posts: [FeedPost],
    interactor: any PostInteracting,
    env: AppEnvironment,
    theme: ThemePalette,
    navigator: AppRouteNavigator,
    isScrollEnabled: Bool,
    canLoadMore: Bool,
    topContentInset: CGFloat,
    bottomContentInset: CGFloat,
    isRefreshing: Bool,
    isLoadingMore: Bool,
    currentProfileUsername: String?,
    currentProfileUserId: String?,
    onOpenPost: ((FeedPost) -> Void)?,
    onOpenImage: @escaping (PostImageOpenContext, FeedPost) -> Void
  ) {
    // UIViewControllerRepresentable may configure us before UIKit loads the view.
    // Do not lose the initial page or its insets waiting for a later SwiftUI update.
    loadViewIfNeeded()
    reconfigureAll = reconfigureAll || self.theme != theme
      || self.currentProfileUsername != currentProfileUsername
      || self.currentProfileUserId != currentProfileUserId
    self.interactor = interactor
    self.env = env
    self.theme = theme
    self.navigator = navigator
    self.isScrollEnabled = isScrollEnabled
    self.canLoadMore = canLoadMore
    self.onOpenPost = onOpenPost
    self.onOpenImage = onOpenImage
    self.isLoadingMore = isLoadingMore
    if isRefreshing && !self.isRefreshing {
      lastRequestedTailPostID = nil
    }
    self.isRefreshing = isRefreshing
    self.currentProfileUsername = currentProfileUsername
    self.currentProfileUserId = currentProfileUserId
    collectionView?.isScrollEnabled = isScrollEnabled
    collectionView?.alwaysBounceVertical = isScrollEnabled
    collectionView?.refreshControl = isScrollEnabled && onRefresh != nil ? refreshControl : nil
    if !isRefreshing, refreshControl.isRefreshing {
      refreshControl.endRefreshing()
    }
    let contentInset = UIEdgeInsets(
      top: topContentInset,
      left: 0,
      bottom: bottomContentInset,
      right: 0
    )
    if collectionView.contentInset != contentInset {
      collectionView.contentInset = contentInset
      collectionView.scrollIndicatorInsets = contentInset
    }

    self.posts = posts
    applySnapshotIfNeeded()
    checkVisiblePagination()
  }

  private func makeLayout() -> UICollectionViewLayout {
    UICollectionViewCompositionalLayout { _, _ in
      let itemSize = NSCollectionLayoutSize(
        widthDimension: .fractionalWidth(1),
        heightDimension: .estimated(220)
      )
      let item = NSCollectionLayoutItem(layoutSize: itemSize)
      let group = NSCollectionLayoutGroup.vertical(layoutSize: itemSize, subitems: [item])
      return NSCollectionLayoutSection(group: group)
    }
  }

  private func configureDataSource() {
    dataSource = DataSource(collectionView: collectionView) { [weak self] collectionView, indexPath, postID in
      MainActor.assumeIsolated {
        guard let self else { return UICollectionViewCell() }
        let post = self.postByID[postID]
        let identifier = FeedPostCellRegistration.reuseIdentifier(for: post)
        let cell = collectionView.dequeueReusableCell(
          withReuseIdentifier: identifier.rawValue,
          for: indexPath
        )
        guard let hostingCell = cell as? FeedHostingCollectionViewCell else { return cell }
        FeedPostCellRegistration.configure(
          hostingCell,
          post: post,
          interactor: self.interactor,
          env: self.env,
          theme: self.theme,
          navigator: self.navigator,
          currentProfileUsername: self.currentProfileUsername,
          currentProfileUserId: self.currentProfileUserId,
          onOpenPost: self.onOpenPost,
          onOpenImage: self.onOpenImage
        )
        return hostingCell
      }
    }
  }

  private func applySnapshotIfNeeded() {
    guard !isApplyingSnapshot else { return }
    let nextPosts = posts
    let plan = FeedDiffableUpdatePlan(previous: appliedPosts, current: nextPosts)
    guard plan.hasChanges || reconfigureAll else { return }

    let anchor = captureScrollAnchor()
    scrollAnchor = nil
    var snapshot = Snapshot()
    snapshot.appendSections([0])
    snapshot.appendItems(nextPosts.map(\.id), toSection: 0)
    snapshot.reloadItems(plan.reloadIDs)
    let reloadIDs = Set(plan.reloadIDs)
    let existingIDs = Set(appliedPosts.map(\.id))
    let reconfigureIDs = reconfigureAll
      ? nextPosts.map(\.id).filter { existingIDs.contains($0) && !reloadIDs.contains($0) }
      : plan.reconfigureIDs
    snapshot.reconfigureItems(reconfigureIDs)
    reconfigureAll = false
    isApplyingSnapshot = true
    postByID = Dictionary(uniqueKeysWithValues: nextPosts.map { ($0.id, $0) })

    // Network pages must appear atomically, including the first page. Insertion
    // animations compete with hosted self-sizing and can move rows under a drag.
    UIView.performWithoutAnimation {
      dataSource.apply(snapshot, animatingDifferences: false) { [weak self] in
        guard let self else { return }
        self.appliedPosts = nextPosts
        self.collectionView.layoutIfNeeded()
        self.positionInitialContentIfNeeded()
        // Hosted SwiftUI cells can invalidate intrinsic height again after this
        // completion. Keep the reading anchor until the user starts scrolling.
        self.scrollAnchor = anchor
        self.restoreScrollAnchor(anchor)
        self.isApplyingSnapshot = false
        self.reportContentHeight()
        // Coalesce updates received during the apply; compare against what UIKit
        // actually displays, never against an uncommitted SwiftUI configuration.
        self.applySnapshotIfNeeded()
        self.checkVisiblePagination()
      }
    }
  }

  private struct ScrollAnchor {
    let postID: String
    let distanceFromViewportTop: CGFloat
  }

  private func captureScrollAnchor() -> ScrollAnchor? {
    guard hasPositionedInitialContent, isScrollEnabled,
          !collectionView.isDragging, !collectionView.isDecelerating,
          collectionView.contentOffset.y + collectionView.adjustedContentInset.top > ScrollChromeDirection.topLock else {
      return nil
    }
    let viewportTop = collectionView.contentOffset.y + collectionView.adjustedContentInset.top
    let visible = collectionView.indexPathsForVisibleItems.sorted()
    for indexPath in visible {
      guard let attributes = collectionView.layoutAttributesForItem(at: indexPath),
            attributes.frame.maxY > viewportTop,
            let postID = dataSource.itemIdentifier(for: indexPath) else { continue }
      return ScrollAnchor(postID: postID, distanceFromViewportTop: attributes.frame.minY - viewportTop)
    }
    return nil
  }

  private func restoreScrollAnchor(_ anchor: ScrollAnchor?) {
    guard !isRestoringScrollAnchor, let anchor,
          !collectionView.isDragging, !collectionView.isDecelerating,
          let indexPath = dataSource.indexPath(for: anchor.postID),
          let attributes = collectionView.layoutAttributesForItem(at: indexPath) else { return }
    isRestoringScrollAnchor = true
    defer { isRestoringScrollAnchor = false }
    let minimumY = -collectionView.adjustedContentInset.top
    let maximumY = max(minimumY, collectionView.contentSize.height
      - collectionView.bounds.height + collectionView.adjustedContentInset.bottom)
    let targetY = min(maximumY, max(minimumY, attributes.frame.minY
      - anchor.distanceFromViewportTop - collectionView.adjustedContentInset.top))
    if abs(collectionView.contentOffset.y - targetY) > 0.5 {
      collectionView.setContentOffset(CGPoint(x: collectionView.contentOffset.x, y: targetY), animated: false)
    }
  }

  private func positionInitialContentIfNeeded() {
    guard !hasPositionedInitialContent, !postByID.isEmpty,
          collectionView.bounds.width > 0, collectionView.bounds.height > 0 else { return }
    hasPositionedInitialContent = true
    if isScrollEnabled {
      collectionView.setContentOffset(
        CGPoint(x: 0, y: -collectionView.adjustedContentInset.top), animated: false
      )
    }
  }

  private func checkVisiblePagination() {
    guard let index = collectionView.indexPathsForVisibleItems.map(\.item).max() else { return }
    maybeLoadMore(near: index)
  }

  fileprivate func maybeLoadMore(near index: Int) {
    guard !isApplyingSnapshot, !isRefreshing else { return }
    guard FeedPaginationTrigger.shouldLoadMore(visibleIndex: index, itemCount: appliedPosts.count) else {
      return
    }
    guard canLoadMore, !isLoadingMore else { return }
    let tailID = appliedPosts.last?.id
    guard tailID != lastRequestedTailPostID else { return }
    lastRequestedTailPostID = tailID
    onLoadMore()
  }

  fileprivate func post(at indexPath: IndexPath) -> FeedPost? {
    guard let postID = dataSource.itemIdentifier(for: indexPath) else { return nil }
    return postByID[postID]
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    positionInitialContentIfNeeded()
    reportContentHeight()
  }

  private func reportContentHeight() {
    guard collectionView != nil, !isScrollEnabled else { return }

    // Never synchronously mutate SwiftUI height state from its update/layout pass.
    // One deferred report coalesces self-sizing changes in embedded profile lists.
    guard !contentHeightReportScheduled else { return }
    contentHeightReportScheduled = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.contentHeightReportScheduled = false
      let height = max(1, self.collectionView.collectionViewLayout.collectionViewContentSize.height
        + self.collectionView.contentInset.top + self.collectionView.contentInset.bottom)
      guard self.lastReportedContentHeight.map({ abs($0 - height) > 0.5 }) ?? true else { return }
      self.lastReportedContentHeight = height
      self.onContentHeightChange(height)
    }
  }

  @objc private func refreshControlTriggered() {
    guard let onRefresh, onRefresh() else {
      refreshControl.endRefreshing()
      return
    }
  }
}

struct FeedDiffableUpdatePlan: Equatable {
  let canReconfigureInPlace: Bool
  let reconfigureIDs: [String]
  let reloadIDs: [String]

  var hasChanges: Bool {
    !canReconfigureInPlace || !reconfigureIDs.isEmpty || !reloadIDs.isEmpty
  }

  init(previous: [FeedPost], current: [FeedPost]) {
    let previousIDs = previous.map(\.id)
    let currentIDs = current.map(\.id)
    canReconfigureInPlace = previousIDs == currentIDs

    let previousByID = Dictionary(uniqueKeysWithValues: previous.map { ($0.id, $0) })
    let changed = current.filter { post in
      guard let previous = previousByID[post.id] else { return false }
      return FeedPostRenderFingerprint(post) != FeedPostRenderFingerprint(previous)
    }
    reloadIDs = changed.compactMap { post in
      guard let previous = previousByID[post.id],
            FeedPostCellRegistration.reuseIdentifier(for: previous) != FeedPostCellRegistration.reuseIdentifier(for: post) else {
        return nil
      }
      return post.id
    }
    let reloaded = Set(reloadIDs)
    reconfigureIDs = changed.compactMap { post in
      guard !reloaded.contains(post.id) else {
        return nil
      }
      return post.id
    }
  }
}

private struct FeedPostRenderFingerprint: Equatable {
  let post: FeedPost

  init(_ post: FeedPost) {
    self.post = post
  }

  static func == (lhs: FeedPostRenderFingerprint, rhs: FeedPostRenderFingerprint) -> Bool {
    let lhs = lhs.post
    let rhs = rhs.post
    return lhs.id == rhs.id
      && lhs.type == rhs.type
      && lhs.headline == rhs.headline
      && lhs.body == rhs.body
      && lhs.editedAt == rhs.editedAt
      && lhs.visibility == rhs.visibility
      && lhs.likeCount == rhs.likeCount
      && lhs.commentCount == rhs.commentCount
      && lhs.repostCount == rhs.repostCount
      && lhs.bookmarkCount == rhs.bookmarkCount
      && lhs.isLiked == rhs.isLiked
      && lhs.isReposted == rhs.isReposted
      && lhs.isBookmarked == rhs.isBookmarked
      && lhs.bookmarkFolderId == rhs.bookmarkFolderId
      && lhs.filmRating == rhs.filmRating
      && lhs.media == rhs.media
      && lhs.mediaUrls == rhs.mediaUrls
      && lhs.linkPreview == rhs.linkPreview
      && lhs.film == rhs.film
      && lhs.author == rhs.author
      && lhs.poll == rhs.poll
      && lhs.repostContext == rhs.repostContext
      && lhs.quotedPost == rhs.quotedPost
      && lhs.quotedPostUnavailable == rhs.quotedPostUnavailable
  }
}

enum FeedPaginationTrigger {
  static let rowsBeforeEnd = 5

  static func shouldLoadMore(visibleIndex: Int, itemCount: Int) -> Bool {
    guard itemCount > 0 else { return false }
    return visibleIndex >= max(itemCount - rowsBeforeEnd, 0)
  }
}

extension FeedCollectionViewController: UICollectionViewDataSourcePrefetching {
  func collectionView(_ collectionView: UICollectionView, prefetchItemsAt indexPaths: [IndexPath]) {
    imagePrefetcher.prefetch(posts: indexPaths.compactMap(post(at:)))
    if let maxIndex = indexPaths.map(\.item).max() {
      maybeLoadMore(near: maxIndex)
    }
  }

  func collectionView(_ collectionView: UICollectionView, cancelPrefetchingForItemsAt indexPaths: [IndexPath]) {
    imagePrefetcher.cancel(posts: indexPaths.compactMap(post(at:)))
  }
}

extension FeedCollectionViewController: UICollectionViewDelegate {
  func collectionView(
    _ collectionView: UICollectionView,
    willDisplay cell: UICollectionViewCell,
    forItemAt indexPath: IndexPath
  ) {
    maybeLoadMore(near: indexPath.item)
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    guard scrollView.isScrollEnabled else {
      return
    }
    handleScrollPosition(scrollView.contentOffset.y + scrollView.adjustedContentInset.top)
  }

  func scrollViewShouldScrollToTop(_ scrollView: UIScrollView) -> Bool {
    scrollAnchor = nil
    return true
  }

  func scrollViewWillBeginDragging(_ scrollView: UIScrollView) {
    scrollAnchor = nil
    lastTranslationY = scrollView.panGestureRecognizer.translation(in: scrollView).y
    handleScrollPosition(scrollView.contentOffset.y + scrollView.adjustedContentInset.top)
  }

  func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
    lastTranslationY = nil
    handleScrollPosition(scrollView.contentOffset.y + scrollView.adjustedContentInset.top)
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    lastTranslationY = nil
    handleScrollPosition(scrollView.contentOffset.y + scrollView.adjustedContentInset.top)
  }

  private func handleScrollPosition(_ offset: CGFloat) {
    if offset <= ScrollChromeDirection.topLock {
      report(.top)
      return
    }

    let recognizer = collectionView.panGestureRecognizer
    guard collectionView.isDragging, recognizer.state == .changed else { return }
    let translationY = recognizer.translation(in: collectionView).y
    let previousTranslationY = lastTranslationY ?? translationY
    let translationDelta = translationY - previousTranslationY
    lastTranslationY = translationY
    let velocityY = recognizer.velocity(in: collectionView).y

    if translationDelta < -ScrollChromeDirection.hideDelta || velocityY < ScrollChromeDirection.hideVelocity {
      report(.down)
    } else if translationDelta > ScrollChromeDirection.showDelta || velocityY > ScrollChromeDirection.showVelocity {
      report(.up)
    }
  }

  private func report(_ direction: ScrollChromeDirection) {
    guard direction != lastDirection else { return }
    lastDirection = direction
    onScrollDirectionChange(direction)
  }
}

/// Self-sizing invalidation can run without a parent view-controller layout pass.
@MainActor
private final class FeedSizingCollectionView: UICollectionView {
  var onLayout: (() -> Void)?

  override func layoutSubviews() {
    super.layoutSubviews()
    onLayout?()
  }
}

@MainActor
final class FeedHostingCollectionViewCell: UICollectionViewCell {
  // Viewport clearance belongs to the collection. Inheriting safe-area insets
  // makes hosted intrinsic heights grow as rows cross the screen edges.
  override var safeAreaInsets: UIEdgeInsets { .zero }

  func configure<Content: View>(
    postID: String?,
    @ViewBuilder content: () -> Content
  ) {
    contentConfiguration = UIHostingConfiguration {
      content()
        .id(postID)
        .fixedSize(horizontal: false, vertical: true)
    }
    .margins(.all, 0)
    .minSize(width: 0, height: 0)
    backgroundColor = .clear
  }

  override func preferredLayoutAttributesFitting(_ layoutAttributes: UICollectionViewLayoutAttributes) -> UICollectionViewLayoutAttributes {
    // Fit at the layout's full row width. Let SwiftUI report its natural height
    // instead of accepting the estimated height as a constraint on rich/media cards.
    let attributes = layoutAttributes.copy() as! UICollectionViewLayoutAttributes
    let size = contentView.systemLayoutSizeFitting(
      CGSize(width: layoutAttributes.size.width, height: UIView.layoutFittingCompressedSize.height),
      withHorizontalFittingPriority: .required,
      verticalFittingPriority: .fittingSizeLevel
    )
    attributes.size.height = ceil(size.height)
    return attributes
  }
}

@MainActor
enum FeedPostCellRegistration {
  enum ReuseIdentifier: String {
    case text = "FeedPostCell.text"
    case review = "FeedPostCell.review"
    case media = "FeedPostCell.media"
    case poll = "FeedPostCell.poll"
    case footer = "FeedPostCell.footer"
  }

  nonisolated static func reuseIdentifier(for post: FeedPost?) -> ReuseIdentifier {
    guard let post else { return .footer }
    if post.poll != nil { return .poll }
    if post.media?.isEmpty == false || post.mediaUrls?.isEmpty == false { return .media }
    if post.type == .review || post.type == .log || post.film != nil { return .review }
    return .text
  }

  static func configure(
    _ cell: FeedHostingCollectionViewCell,
    post: FeedPost?,
    interactor: (any PostInteracting)?,
    env: AppEnvironment?,
    theme: ThemePalette?,
    navigator: AppRouteNavigator,
    currentProfileUsername: String?,
    currentProfileUserId: String?,
    onOpenPost: ((FeedPost) -> Void)?,
    onOpenImage: @escaping (PostImageOpenContext, FeedPost) -> Void
  ) {
    guard let post, let interactor, let env, let theme else {
      cell.configure(postID: nil) {
        EmptyView()
      }
      return
    }

    cell.configure(postID: post.id) {
      VStack(spacing: 0) {
        PostCard(
          post: post,
          interactor: interactor,
          onOpenPost: {
            if let onOpenPost {
              onOpenPost(post)
            } else {
              navigator(.post(PostDestination(post: post)))
            }
          },
          onOpenImage: { context in
            onOpenImage(context, post)
          },
          currentProfileUsername: currentProfileUsername,
          currentProfileUserId: currentProfileUserId
        )
        Divider()
      }
      .environmentObject(env)
      .environment(\.theme, theme)
    }
  }
}

@MainActor
final class FeedImagePrefetcher {
  private var prefetchersByPostID: [String: ImagePrefetcher] = [:]

  func prefetch(posts: [FeedPost]) {
    for post in posts {
      guard prefetchersByPostID[post.id] == nil else { continue }
      let urls = FeedImagePipeline.prefetchURLs(for: post)
      guard !urls.isEmpty else { continue }
      let prefetcher = ImagePrefetcher(
        urls: urls,
        options: FeedImagePipeline.prefetchOptions(for: post)
      )
      prefetchersByPostID[post.id] = prefetcher
      prefetcher.start()
    }
  }

  func cancel(posts: [FeedPost]) {
    for post in posts {
      prefetchersByPostID.removeValue(forKey: post.id)?.stop()
    }
  }
}

@MainActor
enum FeedImagePipeline {
  static let avatarSize = CGSize(width: 40, height: 40)
  static let filmPosterSize = CGSize(width: 64, height: 90)
  static let gridFallbackSize = CGSize(width: 360, height: 360)
  static let carouselFallbackSize = CGSize(width: 260, height: 325)
  static let pollImageSize = CGSize(width: 160, height: 160)

  static func processor(forDisplaySize size: CGSize) -> DownsamplingImageProcessor {
    let scale = UIScreen.main.scale
    return DownsamplingImageProcessor(
      size: CGSize(width: max(size.width, 1) * scale, height: max(size.height, 1) * scale)
    )
  }

  static func options(forDisplaySize size: CGSize) -> KingfisherOptionsInfo {
    [.processor(processor(forDisplaySize: size)), .scaleFactor(UIScreen.main.scale)]
  }

  static func prefetchURLs(for post: FeedPost) -> [URL] {
    var urls: [URL] = []
    append(post.author.avatarUrl, to: &urls)
    append(post.film?.posterUrl, to: &urls)
    post.media?.forEach { append($0.url, to: &urls) }
    post.mediaUrls?.forEach { append($0, to: &urls) }
    post.poll?.options.forEach { append($0.imageUrl, to: &urls) }
    append(post.linkPreview?.imageUrl, to: &urls)
    append(post.quotedPost?.author.avatarUrl, to: &urls)
    append(post.quotedPost?.film?.posterUrl, to: &urls)
    post.quotedPost?.media?.forEach { append($0.url, to: &urls) }
    return Array(Set(urls)).prefix(12).map { $0 }
  }

  static func prefetchOptions(for post: FeedPost) -> KingfisherOptionsInfo {
    if post.media?.isEmpty == false || post.mediaUrls?.isEmpty == false {
      return options(forDisplaySize: gridFallbackSize)
    }
    if post.poll != nil {
      return options(forDisplaySize: pollImageSize)
    }
    return options(forDisplaySize: filmPosterSize)
  }

  private static func append(_ raw: String?, to urls: inout [URL]) {
    guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
      return
    }
    if raw.hasPrefix("/") {
      if let url = URL(string: "https://image.tmdb.org/t/p/w500\(raw)") {
        urls.append(url)
      }
    } else if let url = URL(string: raw) {
      urls.append(url)
    }
  }
}
