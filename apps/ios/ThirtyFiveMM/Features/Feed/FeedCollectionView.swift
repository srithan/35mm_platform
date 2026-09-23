import Kingfisher
import SwiftUI
import UIKit

/// Shared feed renderer architecture note:
/// - `FeedCollectionView` owns the UIKit list surface for Home and Profile posts/reposts:
///   compositional self-sizing rows, diffable snapshots keyed only by stable post ID,
///   and shape-specific reuse IDs.
/// - `PostLayoutCache` stores measured row sizes by post ID. Call sites only ask/store by
///   post ID + width, so future deterministic text measurement can replace this seed cache.
/// - Prefetch runs through `UICollectionViewDataSourcePrefetching`: images/layout hints are
///   prepared roughly 10-15 rows ahead, canceled on scroll-past, and page fetches trigger
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
      layoutCache: context.coordinator.layoutCache,
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

  func makeCoordinator() -> Coordinator {
    Coordinator()
  }

  final class Coordinator {
    let layoutCache = PostLayoutCache()
  }
}

@MainActor
final class PostLayoutCache {
  struct Entry: Equatable {
    let width: CGFloat
    let height: CGFloat
  }

  private var entries: [String: Entry] = [:]
  private let maxEntries = 600

  func entry(for postId: String, width: CGFloat) -> Entry? {
    guard let entry = entries[postId], abs(entry.width - width) < 1 else { return nil }
    return entry
  }

  func store(postId: String, width: CGFloat, height: CGFloat) {
    guard width > 0, height > 0 else { return }
    if entries.count >= maxEntries, entries[postId] == nil {
      entries.removeValue(forKey: entries.keys.first ?? postId)
    }
    entries[postId] = Entry(width: width, height: height)
  }

  func removeAll() {
    entries.removeAll()
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

  private let layoutCache: PostLayoutCache
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
  private var currentProfileUsername: String?
  private var currentProfileUserId: String?
  private var lastRequestedTailPostID: String?
  private var lastTranslationY: CGFloat?
  private var lastDirection: ScrollChromeDirection = .top

  init(
    layoutCache: PostLayoutCache,
    onLoadMore: @escaping () -> Void,
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void
  ) {
    self.layoutCache = layoutCache
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
    collectionView = UICollectionView(frame: .zero, collectionViewLayout: makeLayout())
    collectionView.translatesAutoresizingMaskIntoConstraints = false
    collectionView.backgroundColor = .clear
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
    self.interactor = interactor
    self.env = env
    self.theme = theme
    self.navigator = navigator
    self.isScrollEnabled = isScrollEnabled
    self.canLoadMore = canLoadMore
    self.onOpenPost = onOpenPost
    self.onOpenImage = onOpenImage
    self.isLoadingMore = isLoadingMore
    self.currentProfileUsername = currentProfileUsername
    self.currentProfileUserId = currentProfileUserId
    collectionView?.isScrollEnabled = isScrollEnabled
    collectionView?.alwaysBounceVertical = isScrollEnabled
    collectionView?.refreshControl = isScrollEnabled && onRefresh != nil ? refreshControl : nil
    if !isRefreshing, refreshControl.isRefreshing {
      refreshControl.endRefreshing()
    }
    collectionView?.contentInset = UIEdgeInsets(
      top: topContentInset,
      left: 0,
      bottom: bottomContentInset,
      right: 0
    )
    collectionView?.scrollIndicatorInsets = collectionView.contentInset

    let previousPosts = self.posts
    self.posts = posts
    postByID = Dictionary(uniqueKeysWithValues: posts.map { ($0.id, $0) })
    applySnapshot(previousPosts: previousPosts)
    reportContentHeight()
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
          layoutCache: self.layoutCache,
          onOpenImage: self.onOpenImage
        )
        return hostingCell
      }
    }
  }

  private func applySnapshot(previousPosts: [FeedPost]) {
    guard dataSource != nil else { return }
    var snapshot = Snapshot()
    snapshot.appendSections([0])
    snapshot.appendItems(posts.map(\.id), toSection: 0)

    let plan = FeedDiffableUpdatePlan(previous: previousPosts, current: posts)
    if plan.canReconfigureInPlace {
      if !plan.reconfigureIDs.isEmpty {
        snapshot.reconfigureItems(plan.reconfigureIDs)
      }
      dataSource.apply(snapshot, animatingDifferences: false)
    } else {
      dataSource.apply(snapshot, animatingDifferences: true)
      lastRequestedTailPostID = nil
    }
    DispatchQueue.main.async { [weak self] in
      self?.reportContentHeight()
    }
  }

  fileprivate func maybeLoadMore(near index: Int) {
    guard FeedPaginationTrigger.shouldLoadMore(visibleIndex: index, itemCount: posts.count) else {
      return
    }
    guard canLoadMore, !isLoadingMore else { return }
    let tailID = posts.last?.id
    guard tailID != lastRequestedTailPostID else { return }
    lastRequestedTailPostID = tailID
    onLoadMore()
  }

  fileprivate func post(at indexPath: IndexPath) -> FeedPost? {
    guard indexPath.item >= 0, indexPath.item < posts.count else { return nil }
    return posts[indexPath.item]
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    reportContentHeight()
  }

  private func reportContentHeight() {
    guard collectionView != nil, !isScrollEnabled else { return }

    collectionView.layoutIfNeeded()
    let height = collectionView.collectionViewLayout.collectionViewContentSize.height
      + collectionView.contentInset.top
      + collectionView.contentInset.bottom
    onContentHeightChange(max(1, height))
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

  init(previous: [FeedPost], current: [FeedPost]) {
    let previousIDs = previous.map(\.id)
    let currentIDs = current.map(\.id)
    canReconfigureInPlace = previousIDs == currentIDs

    guard canReconfigureInPlace else {
      reconfigureIDs = []
      return
    }

    let previousByID = Dictionary(uniqueKeysWithValues: previous.map { ($0.id, $0) })
    reconfigureIDs = current.compactMap { post in
      guard let previous = previousByID[post.id],
            FeedPostRenderFingerprint(post) != FeedPostRenderFingerprint(previous) else {
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
    handleScrollPosition(scrollView.contentOffset.y)
  }

  func scrollViewWillBeginDragging(_ scrollView: UIScrollView) {
    lastTranslationY = scrollView.panGestureRecognizer.translation(in: scrollView).y
    handleScrollPosition(scrollView.contentOffset.y)
  }

  func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
    lastTranslationY = nil
    handleScrollPosition(scrollView.contentOffset.y)
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    lastTranslationY = nil
    handleScrollPosition(scrollView.contentOffset.y)
  }

  private func handleScrollPosition(_ offset: CGFloat) {
    if offset <= ScrollChromeDirection.topLock {
      report(.top)
      return
    }

    let recognizer = collectionView.panGestureRecognizer
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

@MainActor
final class FeedHostingCollectionViewCell: UICollectionViewCell {
  private var postID: String?
  private weak var layoutCache: PostLayoutCache?

  func configure<Content: View>(
    postID: String?,
    layoutCache: PostLayoutCache,
    @ViewBuilder content: () -> Content
  ) {
    self.postID = postID
    self.layoutCache = layoutCache
    contentConfiguration = UIHostingConfiguration(content: content)
      .margins(.all, 0)
    backgroundColor = .clear
  }

  override func preferredLayoutAttributesFitting(_ layoutAttributes: UICollectionViewLayoutAttributes) -> UICollectionViewLayoutAttributes {
    let attributes = super.preferredLayoutAttributesFitting(layoutAttributes)
    if let postID {
      layoutCache?.store(
        postId: postID,
        width: attributes.size.width,
        height: attributes.size.height
      )
    }
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

  static func reuseIdentifier(for post: FeedPost?) -> ReuseIdentifier {
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
    layoutCache: PostLayoutCache,
    onOpenImage: @escaping (PostImageOpenContext, FeedPost) -> Void
  ) {
    guard let post, let interactor, let env, let theme else {
      cell.configure(postID: nil, layoutCache: layoutCache) {
        EmptyView()
      }
      return
    }

    cell.configure(postID: post.id, layoutCache: layoutCache) {
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
